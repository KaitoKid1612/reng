import { joinOrderTokens } from "@/lib/assignment";
import { filledPieces, MAX_ORDER_PIECES, MIN_ORDER_PIECES } from "@/lib/order-pieces";

interface OrderPiecesFieldProps {
  id: string;
  pieces: string;
  lang: string;
  label?: string;
  onChange: (pieces: string) => void;
}

// Teachers write the pieces in sentence order; learners get them shuffled.
export function OrderPiecesField({
  id,
  pieces,
  lang,
  label = "Các mảnh theo đúng thứ tự câu (mỗi dòng một mảnh)",
  onChange,
}: OrderPiecesFieldProps) {
  const sentence = joinOrderTokens(filledPieces(pieces.split("\n")));
  return (
    <div className="field">
      <label htmlFor={`${id}-pieces`}>{label}</label>
      <textarea
        id={`${id}-pieces`}
        lang={lang}
        rows={4}
        autoCapitalize="none"
        spellCheck={false}
        value={pieces}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-pieces-hint`}
      />
      <p id={`${id}-pieces-hint`} className="small muted">
        Học viên nhận các mảnh đã xáo trộn và bấm theo đúng thứ tự. Từ {MIN_ORDER_PIECES} đến{" "}
        {MAX_ORDER_PIECES} mảnh, không trùng nhau.
      </p>
      {sentence && (
        <p className="small">
          Câu đúng: <span lang={lang}>{sentence}</span>
        </p>
      )}
    </div>
  );
}
