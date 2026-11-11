import { audioManifest } from "@/lib/data";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nguồn dữ liệu",
  description: "Nguồn và giấy phép của dữ liệu chữ, audio và học liệu dùng trên Reng.",
  alternates: { canonical: "/sources" },
};
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
        kana. Ba font này được phục vụ cùng website, không phụ thuộc font cài trên thiết bị; chữ Hán
        của bài tiếng Trung dùng font giản thể hoặc phồn thể có sẵn trên thiết bị.
      </p>
      <p>
        Giấy phép SIL Open Font License và thông tin tác giả:{" "}
        <a href="/fonts/be-vietnam-pro-LICENSE.txt">Be Vietnam Pro</a>,{" "}
        <a href="/fonts/noto-sans-jp-LICENSE.txt">Noto Sans JP</a>,{" "}
        <a href="/fonts/klee-one-LICENSE.txt">Klee One</a>.
      </p>
      <h2>Hình minh họa từ vựng</h2>
      <p>
        Icon cạnh từ vựng và hình ghép trong slide luyện tập là Fluent Emoji (kiểu Flat) của
        Microsoft, dùng theo <a href="/icons/vocab/LICENSE.txt">giấy phép MIT</a>. Hình không chứa
        chữ (hình ghép chỉ có số thứ tự); nghĩa tiếng Việt luôn hiển thị bên cạnh để không phụ thuộc
        vào hình.
      </p>
      <h2>Audio bảng chữ cái</h2>
      <p>
        {count
          ? `Đã cấu hình ${count} audio kana. File giọng đọc cần được kiểm duyệt phát âm trước khi dùng với lớp thật.`
          : "Chưa có file MP3 được cấu hình. Trang thử dùng giọng Nhật có sẵn trên thiết bị khi bạn bấm nghe; một số thiết bị có thể chưa có giọng Nhật."}
      </p>
      <p>
        Chế độ dự phòng phụ thuộc hệ điều hành và trình duyệt. Bạn vẫn có thể học bảng chữ và luyện
        romaji khi audio chưa khả dụng.
      </p>
      <h2>Giọng đọc bài nghe</h2>
      {/* Unreal Speech's free plan asks for a link to unrealspeech.com wherever its audio is used. */}
      <p>
        Audio của các câu nghe Reng tự biên soạn (bộ đề nghe Minna no Nihongo 1–15, câu nghe N5 và
        N4 trong ngân hàng ôn) và phần nghe của đề chính thức JLPT bên dưới được tạo bằng{" "}
        <a href="https://unrealspeech.com" rel="noopener">
          Unreal Speech
        </a>{" "}
        (giọng Sakura, Rina, Yuki, Haruto). Lời nghe và câu hỏi tự biên soạn do Reng viết; giáo viên
        nghe duyệt trước khi giao cho lớp.
      </p>
      <h2>Đề chính thức JLPT</h2>
      <p>
        Các đề thi thử &quot;Đề chính thức JLPT N5/N4&quot; (tập 2012 và tập 2018) lấy câu hỏi, hình
        và lời nghe từ <span lang="ja">日本語能力試験 公式問題集</span> và{" "}
        <span lang="ja">公式問題集 第二集</span> đăng miễn phí trên trang chính thức của kỳ thi:{" "}
        <span lang="ja">
          出典　日本語能力試験公式ウェブサイト（
          <a href="https://www.jlpt.jp/samples/sampleindex.html" rel="noopener">
            https://www.jlpt.jp/
          </a>
          ）
        </span>
        . Reng dùng làm tài liệu dạy tiếng Nhật không thu phí theo{" "}
        <a href="https://www.jlpt.jp/policy.html" rel="noopener">
          chính sách của trang
        </a>
        . Bản ghi âm gốc có tác phẩm của bên thứ ba nên Reng không chép: phần nghe được đọc lại
        nguyên văn lời nghe chính thức bằng giọng máy, và trang kết quả có link tới bản ghi âm gốc.
        Lời giải thích tiếng Việt do Reng biên soạn. Reng không dùng các bản &quot;đề thi
        tháng/năm&quot; chép lại lưu hành trên mạng.
      </p>
    </article>
  );
}
