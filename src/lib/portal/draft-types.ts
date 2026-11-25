// What a developer's submission holds: every value as typed in the portal (strings, and string
// lists for multi-choice fields), so a draft can be saved half-filled and reopened as it was.

export type Fields = Record<string, string | string[]>;

export type MediaItem = {
  kind: string;
  group: string;
  url: string;
  captionAr: string;
  captionEn: string;
  width?: number;
  height?: number;
};

export type ProjectDraft = {
  project: Fields;
  typologies: Fields[];
  plans: Fields[];
  media: MediaItem[];
  distances: Fields[];
};

export type ProfileDraft = { profile: Fields };

/** Field errors keyed by path: "project.nameAr", "typologies.2.priceFrom", "media.0.url"… */
export type DraftErrors = Record<string, string>;

export const LIMITS = { typologies: 60, plans: 60, media: 200, distances: 30 } as const;

export const emptyProjectDraft = (): ProjectDraft => ({
  project: { status: "LAUNCH", categories: ["RESIDENTIAL"], currency: "EGP" },
  typologies: [],
  plans: [],
  media: [],
  distances: [],
});
