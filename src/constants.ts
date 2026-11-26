export const DEFAULT_BASE_URL = "https://tryiton.now/api/v1";

/** Per-request timeout when `timeoutMs` isn't given. */
export const DEFAULT_TIMEOUT_MS = 60000;

/** waitForResult defaults. */
export const DEFAULT_POLL_INTERVAL_MS = 2000;
export const DEFAULT_WAIT_TIMEOUT_MS = 120000;

/** The supported `haircut` values for hairstyle try-on. */
export const HAIRCUTS = [
  "Afro", "BobCut", "BowlCut", "BoxBraids", "BuzzCut", "Chignon", "CombOver",
  "CornrowBraids", "CurlyBob", "CurlyShag", "DoubleBun", "Dreadlocks", "FauxHawk",
  "FishtailBraid", "LongCurly", "LongHairTiedUp", "LongHimeCut", "LongStraight",
  "LongTwintails", "LongWavy", "LongWavyCurtainBangs", "ManBun", "MessyTousled",
  "PixieCut", "Pompadour", "Ponytail", "ShortCurlyPixie", "ShortTwintails",
  "ShoulderLengthHair", "Spiky", "TexturedFringe", "TwinBraids", "Updo", "WavyShag",
] as const;
