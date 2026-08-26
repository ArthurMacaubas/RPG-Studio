// V3: unified "sheet descriptor" shape shared by the two built-in systems
// and the custom-system builder (CampaignAttribute/CampaignSkill in the
// DB). The character sheet component only ever deals with this shape, so
// it doesn't care whether the fields came from a preset or from the
// database.

export interface SheetAttribute {
  id: string;
  name: string;
  shortLabel: string;
  min: number;
  max: number;
  defaultVal: number;
}

export interface SheetSkill {
  id: string;
  name: string;
  linkedAttr?: string;
}

export const ORDEM_PARANORMAL_ATTRIBUTES: SheetAttribute[] = [
  { id: 'forca', name: 'Força', shortLabel: 'FOR', min: 0, max: 5, defaultVal: 1 },
  { id: 'agilidade', name: 'Agilidade', shortLabel: 'AGI', min: 0, max: 5, defaultVal: 1 },
  { id: 'intelecto', name: 'Intelecto', shortLabel: 'INT', min: 0, max: 5, defaultVal: 1 },
  { id: 'vigor', name: 'Vigor', shortLabel: 'VIG', min: 0, max: 5, defaultVal: 1 },
  { id: 'presenca', name: 'Presença', shortLabel: 'PRE', min: 0, max: 5, defaultVal: 1 },
  { id: 'pv', name: 'Pontos de Vida', shortLabel: 'PV', min: 0, max: 999, defaultVal: 20 },
  { id: 'pe', name: 'Pontos de Esforço', shortLabel: 'PE', min: 0, max: 999, defaultVal: 4 },
  { id: 'sanidade', name: 'Sanidade', shortLabel: 'SAN', min: 0, max: 20, defaultVal: 20 }
];

export const ORDEM_PARANORMAL_SKILLS: SheetSkill[] = [
  { id: 'acrobacia', name: 'Acrobacia', linkedAttr: 'agilidade' },
  { id: 'adestramento', name: 'Adestramento', linkedAttr: 'presenca' },
  { id: 'artes', name: 'Artes', linkedAttr: 'presenca' },
  { id: 'atletismo', name: 'Atletismo', linkedAttr: 'forca' },
  { id: 'atualidades', name: 'Atualidades', linkedAttr: 'intelecto' },
  { id: 'ciencias', name: 'Ciências', linkedAttr: 'intelecto' },
  { id: 'crime', name: 'Crime', linkedAttr: 'agilidade' },
  { id: 'diplomacia', name: 'Diplomacia', linkedAttr: 'presenca' },
  { id: 'enganacao', name: 'Enganação', linkedAttr: 'presenca' },
  { id: 'fortitude', name: 'Fortitude', linkedAttr: 'vigor' },
  { id: 'furtividade', name: 'Furtividade', linkedAttr: 'agilidade' },
  { id: 'iniciativa', name: 'Iniciativa', linkedAttr: 'agilidade' },
  { id: 'intimidacao', name: 'Intimidação', linkedAttr: 'presenca' },
  { id: 'intuicao', name: 'Intuição', linkedAttr: 'presenca' },
  { id: 'investigacao', name: 'Investigação', linkedAttr: 'intelecto' },
  { id: 'luta', name: 'Luta', linkedAttr: 'forca' },
  { id: 'medicina', name: 'Medicina', linkedAttr: 'intelecto' },
  { id: 'ocultismo', name: 'Ocultismo', linkedAttr: 'intelecto' },
  { id: 'percepcao', name: 'Percepção', linkedAttr: 'presenca' },
  { id: 'pilotagem', name: 'Pilotagem', linkedAttr: 'agilidade' },
  { id: 'pontaria', name: 'Pontaria', linkedAttr: 'agilidade' },
  { id: 'profissao', name: 'Profissão', linkedAttr: 'intelecto' },
  { id: 'reflexos', name: 'Reflexos', linkedAttr: 'agilidade' },
  { id: 'religiao', name: 'Religião', linkedAttr: 'presenca' },
  { id: 'sobrevivencia', name: 'Sobrevivência', linkedAttr: 'intelecto' },
  { id: 'tatica', name: 'Tática', linkedAttr: 'intelecto' },
  { id: 'tecnologia', name: 'Tecnologia', linkedAttr: 'intelecto' },
  { id: 'vontade', name: 'Vontade', linkedAttr: 'presenca' }
];

export const DND5E_ATTRIBUTES: SheetAttribute[] = [
  { id: 'str', name: 'Força', shortLabel: 'STR', min: 1, max: 30, defaultVal: 10 },
  { id: 'dex', name: 'Destreza', shortLabel: 'DEX', min: 1, max: 30, defaultVal: 10 },
  { id: 'con', name: 'Constituição', shortLabel: 'CON', min: 1, max: 30, defaultVal: 10 },
  { id: 'int', name: 'Inteligência', shortLabel: 'INT', min: 1, max: 30, defaultVal: 10 },
  { id: 'wis', name: 'Sabedoria', shortLabel: 'WIS', min: 1, max: 30, defaultVal: 10 },
  { id: 'cha', name: 'Carisma', shortLabel: 'CHA', min: 1, max: 30, defaultVal: 10 },
  { id: 'hp', name: 'Pontos de Vida', shortLabel: 'HP', min: 0, max: 999, defaultVal: 10 },
  { id: 'ac', name: 'Classe de Armadura', shortLabel: 'CA', min: 0, max: 30, defaultVal: 10 }
];

export const DND5E_SKILLS: SheetSkill[] = [
  { id: 'acrobatics', name: 'Acrobacia', linkedAttr: 'dex' },
  { id: 'animal_handling', name: 'Adestrar Animais', linkedAttr: 'wis' },
  { id: 'arcana', name: 'Arcanismo', linkedAttr: 'int' },
  { id: 'athletics', name: 'Atletismo', linkedAttr: 'str' },
  { id: 'deception', name: 'Enganação', linkedAttr: 'cha' },
  { id: 'history', name: 'História', linkedAttr: 'int' },
  { id: 'insight', name: 'Intuição', linkedAttr: 'wis' },
  { id: 'intimidation', name: 'Intimidação', linkedAttr: 'cha' },
  { id: 'investigation', name: 'Investigação', linkedAttr: 'int' },
  { id: 'medicine', name: 'Medicina', linkedAttr: 'wis' },
  { id: 'nature', name: 'Natureza', linkedAttr: 'int' },
  { id: 'perception', name: 'Percepção', linkedAttr: 'wis' },
  { id: 'performance', name: 'Atuação', linkedAttr: 'cha' },
  { id: 'persuasion', name: 'Persuasão', linkedAttr: 'cha' },
  { id: 'religion', name: 'Religião', linkedAttr: 'int' },
  { id: 'sleight_of_hand', name: 'Prestidigitação', linkedAttr: 'dex' },
  { id: 'stealth', name: 'Furtividade', linkedAttr: 'dex' },
  { id: 'survival', name: 'Sobrevivência', linkedAttr: 'wis' }
];
