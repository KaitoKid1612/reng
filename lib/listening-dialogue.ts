// A listening transcript written as a conversation, the way JLPT scripts are: every turn starts
// with the speaker's label and a full-width colon, as in 女：…。男：…。 A listening set can give
// each label its own voice, so learners hear who says what instead of one voice reading the
// labels aloud.
const TURN_LABEL = /(?:^|(?<=[。！？」…]))\s*([^\s：、。！？「」]{1,6})：/gu;

export interface SpeakerTurn {
  speaker: string;
  text: string;
}

/**
 * The turns of a labelled transcript, or null when it does not start with a speaker label (a
 * narration read by one voice). Throws when a label has nothing after it.
 */
export function splitSpeakerTurns(transcript: string): SpeakerTurn[] | null {
  const text = transcript.trim();
  const labels = [...text.matchAll(TURN_LABEL)];
  if (!labels.length || labels[0].index !== 0) {
    return null;
  }
  return labels.map((label, index) => {
    const start = label.index + label[0].length;
    const end = labels[index + 1]?.index ?? text.length;
    const turn = { speaker: label[1], text: text.slice(start, end).trim() };
    if (!turn.text) {
      throw new Error(`The turn of ${turn.speaker} has no words: ${text.slice(0, 40)}…`);
    }
    return turn;
  });
}
