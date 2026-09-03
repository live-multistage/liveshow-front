export type AgeBracket =
  | 'AGE_13_17'
  | 'AGE_18_24'
  | 'AGE_25_34'
  | 'AGE_35_44'
  | 'AGE_45_54'
  | 'AGE_55_PLUS';

export const AGE_BRACKETS: AgeBracket[] = [
  'AGE_13_17',
  'AGE_18_24',
  'AGE_25_34',
  'AGE_35_44',
  'AGE_45_54',
  'AGE_55_PLUS',
];

export const AGE_BRACKET_LABELS: Record<AgeBracket, string> = {
  AGE_13_17: '13–17',
  AGE_18_24: '18–24',
  AGE_25_34: '25–34',
  AGE_35_44: '35–44',
  AGE_45_54: '45–54',
  AGE_55_PLUS: '55+',
};
