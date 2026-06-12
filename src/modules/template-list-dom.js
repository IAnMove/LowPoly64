const TEMPLATE_I18N = {
  chair: 'tplSilla',
  table: 'tplMesa',
  bed: 'tplCama',
  bookshelf: 'tplEstanteria',
  desk: 'tplEscritorio',
  stool: 'tplTaburete',
  tree: 'tplArbol',
  rock: 'tplRoca',
  bush: 'tplArbusto',
  mushroom: 'tplSeta',
  flower: 'tplFlor',
  house: 'tplCasa',
  door: 'tplPuerta',
  window: 'tplVentana',
  stairs: 'tplEscalera',
  fence: 'tplValla',
  bridge: 'tplPuente',
  crate: 'tplCaja',
  barrel: 'tplBarril',
  chest: 'tplCofre',
  potion: 'tplPocion',
  sword: 'tplEspada',
  shield: 'tplEscudo',
  torch: 'tplAntorcha',
  'lamp-post': 'tplFarola',
  coin: 'tplMoneda',
  key: 'tplLlave',
  lever: 'tplPalanca',
  button: 'tplBoton',
  breakable_tablet: 'tplCajaRompible',
  pressure_plate: 'tplPlacaPresion',
  villager: 'tplAldeano',
  merchant: 'tplMercader',
  guard: 'tplGuardia',
  hero: 'tplHeroe',
  knight: 'tplCaballero',
  knight_horse: 'tplCaballeroMontado',
  archer: 'tplArquero',
  mage: 'tplMago',
  bomber: 'tplBombardero',
  'old-sage': 'tplViejoSabio',
  slime: 'tplSlime',
  skeleton: 'tplEsqueleto',
  bat: 'tplMurcielago',
};

const CATEGORY_I18N = {
  Mobiliario: 'catMobiliario',
  Naturaleza: 'catNaturaleza',
  Arquitectura: 'catArquitectura',
  Props: 'catProps',
  Personajes: 'catPersonajes',
  Monstruos: 'catMonstruos',
};

function createElement(root, tagName) {
  return root?.createElement?.(tagName) || globalThis.document?.createElement?.(tagName) || null;
}

function getTemplateLabel(template, translate) {
  const key = TEMPLATE_I18N[template.id];
  return key ? translate(key) : template.name;
}

function getCategoryLabel(category, translate) {
  const key = CATEGORY_I18N[category];
  return key ? translate(key) : category;
}

export function renderTemplateList(container, categories, handlers = {}, root = globalThis.document) {
  if (!container?.replaceChildren || !categories?.[Symbol.iterator]) return false;

  container.replaceChildren();
  const translate = handlers.translate || ((key) => key);

  for (const [category, templates] of categories) {
    const section = createElement(root, 'div');
    const header = createElement(root, 'button');
    const headerLabel = createElement(root, 'span');
    const toggleArrow = createElement(root, 'span');
    const list = createElement(root, 'div');
    if (!section || !header || !headerLabel || !toggleArrow || !list) return false;

    section.className = 'mb-3';

    header.className = 'w-full text-left text-[#ffcc00] text-xs mb-2 tracking-widest flex justify-between items-center cursor-pointer hover:text-white';

    headerLabel.textContent = getCategoryLabel(category, translate).toUpperCase();

    toggleArrow.className = 'toggle-arrow';
    toggleArrow.innerHTML = '&#9660;';
    header.append(headerLabel, toggleArrow);

    list.className = 'flex flex-col gap-1';

    templates.forEach((template) => {
      const button = createElement(root, 'button');
      const name = createElement(root, 'span');
      const arrow = createElement(root, 'span');
      if (!button || !name || !arrow) return;

      button.className = 'retro-button bg-zinc-800 hover:bg-[#ffcc00] hover:text-black px-3 py-2 text-left text-xs flex justify-between items-center border border-zinc-700';

      name.textContent = getTemplateLabel(template, translate);

      arrow.className = 'text-[#ffcc00]';
      arrow.innerHTML = '&rarr;';

      button.append(name, arrow);
      button.addEventListener('click', () => handlers.onTemplateSelected?.(template.id));
      list.appendChild(button);
    });

    header.addEventListener('click', () => {
      list.classList.toggle('hidden');
      toggleArrow.innerHTML = list.classList.contains('hidden') ? '&#9654;' : '&#9660;';
    });

    section.appendChild(header);
    section.appendChild(list);
    container.appendChild(section);
  }

  return true;
}

export function createTemplateListDomAdapter({ root = globalThis.document } = {}) {
  return {
    renderTemplateList: (container, categories, handlers) => renderTemplateList(container, categories, handlers, root),
  };
}
