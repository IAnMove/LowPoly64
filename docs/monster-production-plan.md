# Monster Production Plan

Primer batch ya implementado con rigs compartidos y ataques propios por monstruo.

## Shared Rigs

- `PROP_MONSTER_CORE`
  - Use for plant traps, mimic props, wisps, blobs, hovering cores.
  - Shared animations: `idle`, `hurt`, `die`.
  - Per-template custom attack animation on top.

- `QUADRUPED_MONSTER`
  - Use for burrowers, hounds, amphibians, shell creatures and beetle-like enemies.
  - Shared animations: `idle`, `walk`, `run`, `hurt`, `die`.
  - Per-template custom attack animation on top.

## Batch 1: Implemented

| Monster | Theme | Difficulty | Rig Base | Priority |
| --- | --- | --- | --- | --- |
| `mushroom_hopper` | forest / cave | easy | `PROP_MONSTER_CORE` | high |
| `thorn_pod` | plant / trap | easy | `PROP_MONSTER_CORE` | high |
| `lantern_wisp` | ruins / graveyard | easy | `PROP_MONSTER_CORE` | high |
| `rock_mimic` | cave / ambush | medium | `PROP_MONSTER_CORE` | high |
| `mole_driller` | cave / dirt | medium | `QUADRUPED_MONSTER` | high |
| `bone_hound` | graveyard / ruins | medium | `QUADRUPED_MONSTER` | high |
| `lava_toad` | volcano | medium | `QUADRUPED_MONSTER` | high |
| `bomb_snail` | dungeon / hazard | medium | `QUADRUPED_MONSTER` | high |

## Batch 2: Implemented

| Monster | Theme | Difficulty | Rig Base | Priority |
| --- | --- | --- | --- | --- |
| `shell_runner` | plains / dungeon | easy | `QUADRUPED_MONSTER` | high |
| `crab_snapper` | coast / sewer | medium | `QUADRUPED_MONSTER` | medium |
| `ice_beetle` | snow / cave | medium | `QUADRUPED_MONSTER` | high |
| `jelly_floater` | swamp / magic | easy | `PROP_MONSTER_CORE` | medium |
| `totem_idol` | ruins / temple | medium | `PROP_MONSTER_CORE` | medium |
| `spore_blob` | swamp / cave | easy | `PROP_MONSTER_CORE` | medium |

## Batch 3: Next Shared Family

Recommended new shared family for the next pass:

- `BIRD_MONSTER`
  - Shared animations: `idle`, `walk`, `attack`, `hurt`, `die`.
  - Good for `moth_witch` and `crow_raider`.

## Batch 4: Biped Monsters

These can start from `HUMANOID_DEFAULT` with a monster-specific profile or a dedicated brute profile.

| Monster | Theme | Difficulty | Rig Base | Priority |
| --- | --- | --- | --- | --- |
| `pumpkin_imp` | cursed forest | easy | `HUMANOID_DEFAULT` | medium |
| `cactus_crawler` | desert | easy | `HUMANOID_DEFAULT` | medium |
| `cyclops_brute` | dungeon / mini-boss | hard | `HUMANOID_DEFAULT` | high |

## Batch 5: Edge Cases

| Monster | Theme | Difficulty | Rig Base | Priority |
| --- | --- | --- | --- | --- |
| `bog_leech` | swamp | easy | custom / prop hybrid | low |
| `mole_driller_elite` | cave | medium | `QUADRUPED_MONSTER` | low |
| `thorn_pod_elite` | trap | medium | `PROP_MONSTER_CORE` | low |
| `lantern_wisp_elite` | ruins | medium | `PROP_MONSTER_CORE` | low |

## Follow-Up Content

- `enemy_projectile_seed`
- `enemy_projectile_spore`
- `enemy_projectile_fire_orb`
- `enemy_projectile_eye_orb`
- `enemy_projectile_bomb_shell`
- `enemy_spawner_mushroom_nest`
- `enemy_spawner_bone_pile`
- `enemy_spawner_ghost_rift`
- `hazard_thorn_patch`
- `hazard_lava_puddle`
