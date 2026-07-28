# PNG to Flat Model

`PNG TO FLAT MODEL` converts a transparent image into a textured, closed 2.5D
mesh entirely in the browser. It is useful for side-view fish, leaves, badges,
weapons, sprites, signs, wings, and other objects whose silhouette carries most
of their shape.

It does not use an AI provider or consume model tokens. Retrovisor reads the
alpha channel, estimates depth from distance to the silhouette edge, and lets
you correct that estimate by painting a depth map.

## Quick workflow

1. Prepare a PNG or WebP with real transparency. Remove white or checkerboard
   backgrounds in an image editor first.
2. Open Retrovisor and click **PNG TO FLAT MODEL** in the left panel.
3. Click **LOAD PNG / WEBP** and choose the image.
4. Orbit and zoom the 3D preview. Generation does not touch the scene yet.
5. Tune the automatic shape:

   - **Target size** controls the longest visible dimension in scene units.
   - **Mesh density** controls silhouette detail and polygon count.
   - **Thickness** controls overall front-to-back size.
   - **Bulge curve** changes how quickly the center becomes thick. Lower values
     broaden the volume; higher values keep more of it near the center.
   - **Alpha cut** ignores nearly transparent pixels. Raise it for fuzzy halos;
     lower it for faint fins or hair.
   - **Smoothing** softens abrupt depth changes without changing the alpha crop.
   - **Paint effect** scales the manual red/blue depth map.
   - **Mirror texture on back** makes the rear image read naturally by default.
   - **Side color** fills the generated boundary wall.

6. Correct local depth in the image panel:

   - **Inflate** paints red and adds local depth.
   - **Deflate** paints blue and removes local depth.
   - **Smooth** blends nearby painted corrections.
   - **Erase** moves the painted correction toward the automatic result.
   - **Reset map** removes all manual corrections.

7. Click **CREATE MODEL**. Retrovisor adds one selected derived group containing
   the textured surface and side-wall mesh.
8. Use Ctrl+Z/Ctrl+Shift+Z to undo or redo the whole creation as one action.
9. To revise it later, select the group and click **EDIT PNG MODEL** in the right
   properties panel. Updating is also one undoable action and preserves the
   group transform.

## Input advice

- Use a clean silhouette with transparent padding around it.
- A side or near-orthographic view produces the most predictable result.
- For a fish, keep fins and tail opaque enough to survive the alpha threshold.
- Start at medium density. Increase density only when the outline visibly needs
  it; density does not add information absent from the source.
- Paint broad inflate strokes over the torso, smaller strokes around the head,
  and deflate strokes near thin fins or the tail base.
- If the source shows only one side, the back is an inferred mirrored surface.

## Persistence and export

Scene save/load preserves the normalized embedded image, generation settings,
alpha/crop analysis, manual depth map, texture, and generated custom geometry.
Copy or export object JSON preserves an editable compact recipe and regenerates
it on import. Standard GLB export includes the generated surface, side walls,
and texture.

The original external file path is never stored or requested. Input processing
is local and accepts PNG/WebP files up to 5 MB, normalized to at most 1024 pixels
on the longest side. Mesh density and paint-map dimensions are bounded.

## Current limitations

- A single image cannot reveal the true back, hidden fins, asymmetry, or full
  anatomy. The output is deliberately 2.5D rather than a photogrammetry model.
- The silhouette uses a regular grid, so diagonal edges can look stepped at low
  density.
- Holes in the alpha mask are represented by cell boundaries; very tiny holes
  or isolated pixels may disappear during sampling.
- Depth painting changes thickness, not the outline or texture. Edit the source
  image when the silhouette itself is wrong.
- A front-facing photograph is usually less convincing than a clean side-view
  illustration because the inferred thickness has less useful shape evidence.

## Troubleshooting

**The app says the image is fully transparent**

Lower **Alpha cut**, or check that the subject actually has non-zero alpha.

**A white rectangle appears around the subject**

The file has a white background rather than transparency. Remove the background
and export it again as PNG or WebP with alpha.

**Fins or thin details disappear**

Lower **Alpha cut**, increase **Mesh density**, and ensure those pixels are not
almost transparent.

**The body is too balloon-like**

Increase **Bulge curve**, lower **Thickness**, then paint **Deflate** over the
problem region.

**The center is too flat**

Lower **Bulge curve** or paint **Inflate** with a broad, soft stroke.

**The saved object cannot be edited**

Select the root derived group, not one of its two child meshes. The properties
panel then shows **EDIT PNG MODEL**.
