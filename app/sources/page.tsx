import { audioManifest } from "@/lib/data";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nguồn dữ liệu" };
export default function SourcesPage() {
  const count = Object.keys(audioManifest.assets).length;
  return (
    <article className="prose-page">
      <h1>Nguồn dữ liệu</h1>
      <h2>Bảng chữ cái</h2>
      <p>
        Hiragana và Katakana được biên soạn trong dự án, gồm âm cơ bản, âm đục, âm nửa đục và âm
        ghép. Mỗi hệ có 104 mục. Trang hiện chưa nhập dữ liệu từ JMdict, KANJIDIC2 hoặc KanjiVG.
      </p>
      <h2>Chữ hiển thị</h2>
      <p>
        Be Vietnam Pro cho tiếng Việt, Noto Sans JP cho nội dung tiếng Nhật và Klee One cho mẫu
        kana. Font được phục vụ cùng website, không phụ thuộc font cài trên thiết bị.
      </p>
      <p>
        Giấy phép SIL Open Font License và thông tin tác giả:{" "}
        <a href="/fonts/be-vietnam-pro-LICENSE.txt">Be Vietnam Pro</a>,{" "}
        <a href="/fonts/noto-sans-jp-LICENSE.txt">Noto Sans JP</a>,{" "}
        <a href="/fonts/klee-one-LICENSE.txt">Klee One</a>.
      </p>
      <h2>Audio</h2>
      <p>
        {count
          ? `Đã cấu hình ${count} audio kana. File giọng đọc cần được kiểm duyệt phát âm trước khi dùng với lớp thật.`
          : "Chưa có file MP3 được cấu hình. Trang thử dùng giọng Nhật có sẵn trên thiết bị khi bạn bấm nghe; một số thiết bị có thể chưa có giọng Nhật."}
      </p>
      <p>
        Chế độ dự phòng phụ thuộc hệ điều hành và trình duyệt. Bạn vẫn có thể học bảng chữ và luyện
        romaji khi audio chưa khả dụng.
      </p>
    </article>
  );
}
