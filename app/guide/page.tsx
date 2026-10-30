import Link from "next/link";

import type { Metadata } from "next";

const DESCRIPTION =
  "Hướng dẫn dùng Reng cho giáo viên và học viên: tạo bài từ mẫu, mở lớp, dạy qua Google Meet, giao bài và bài luyện hằng ngày, vào lớp bằng mã, làm bài và ôn tập.";

export const metadata: Metadata = {
  title: "Hướng dẫn sử dụng",
  description: DESCRIPTION,
  alternates: { canonical: "/guide" },
  openGraph: { title: "Hướng dẫn sử dụng Reng", description: DESCRIPTION, url: "/guide" },
};

interface GuideSection {
  id: string;
  title: string;
  steps: string[];
  note?: string;
}

const TEACHER_SECTIONS: GuideSection[] = [
  {
    id: "teacher-sign-up",
    title: "Đăng ký giảng dạy",
    steps: [
      "Mở trang Đăng ký giáo viên, nhập họ tên, email và mật khẩu (ít nhất 8 ký tự). Mở thư xác nhận, bấm liên kết để kích hoạt tài khoản và quay lại trang đăng ký giảng dạy.",
      "Ở trang Đăng ký giảng dạy, đánh dấu ô cam kết rồi bấm Gửi yêu cầu giảng dạy.",
      "Nếu hệ thống yêu cầu duyệt, đợi quản trị viên mở quyền; nếu không, bạn có thể bắt đầu ngay. Mục Giảng dạy hiện trên thanh đầu trang. Một tài khoản vừa dạy vừa học được ở lớp khác.",
    ],
  },
  {
    id: "teacher-lesson",
    title: "Tạo bài học",
    steps: [
      "Vào Giảng dạy → Tạo bài mới. Bấm Tạo bài 11 từ mẫu để có sẵn bài theo trình tự Minna no Nihongo Sơ cấp I: từ vựng, bảng đếm, mẫu câu, hội thoại, luyện thay thế và 50 câu luyện.",
      "Bài mẫu là bản nháp riêng của bạn. Đọc lại, sửa theo lớp mình rồi bấm Xuất bản; học viên dùng sách của mình để đối chiếu.",
      "Bài tiếp theo: bấm Tạo bản sao ở bài đã có rồi sửa nội dung, hoặc soạn mới ở mục Soạn bài tiếng Nhật.",
    ],
  },
  {
    id: "teacher-chinese",
    title: "Soạn bài tiếng Trung",
    steps: [
      "Ở Tạo bài mới, chọn Soạn bài tiếng Trung. Chọn giản thể hoặc phồn thể, mẫu bài và mục tiêu nhỏ đầu tiên.",
      "Đi qua năm bước: mục tiêu, từ vựng, mẫu câu và hội thoại, câu luyện, slide và xuất bản. Bước Từ vựng cho dán bảng chữ Hán – pinyin – nghĩa Việt từ Excel; CSV tiếng Nhật là công cụ riêng.",
      "Duyệt từng đáp án trước khi xuất bản. Pinyin cần đúng dấu thanh và khoảng trắng; giản thể và phồn thể không tự đổi cho nhau.",
    ],
  },
  {
    id: "teacher-editor",
    title: "Soạn và sửa slide",
    steps: [
      "Editor có các mục Thông tin bài, Từ vựng, Ngữ pháp (mẫu câu và câu ví dụ), Câu luyện và Slide; khung bên cạnh xem trước đúng như khi chiếu.",
      "Thêm slide bằng cách chọn loại: tiêu đề, từ vựng (tối đa 8 từ), mẫu câu, câu ví dụ, hội thoại, bảng / luyện thay thế, câu luyện, ghi chú hoặc ảnh. Kéo hoặc dùng mũi tên để đổi thứ tự.",
      "Furigana viết {漢字|かんじ}, ví dụ {郵便局|ゆうびんきょく}. Bảng có thể dán từ Excel hoặc gõ các ô cách nhau bằng dấu |; bật luyện thay thế để ẩn câu mẫu và hiện từng hàng khi dạy.",
      "Ghi chú giảng viên chỉ hiện ở cửa sổ Presenter. Bấm Lưu nháp thường xuyên; Xuất bản tạo phiên bản mới, lớp chỉ chuyển sang phiên bản mới khi bạn chọn trong trang Giao bài.",
    ],
  },
  {
    id: "teacher-class",
    title: "Mở lớp và mời học viên",
    steps: [
      "Vào Giảng dạy → Tạo lớp: nhập tên lớp, chọn Tiếng Nhật, Tiếng Trung giản thể hoặc Tiếng Trung phồn thể theo lớp, số học viên tối đa (để trống nếu không giới hạn) và link Google Meet dạng https://meet.google.com/abc-defg-hij.",
      "Gửi cho học viên link vào lớp kèm mã lớp hiển thị trong trang lớp. Đổi mã mới hoặc Ngừng nhận học viên khi cần.",
    ],
  },
  {
    id: "teacher-assign",
    title: "Đưa bài vào lớp và giao bài tập",
    steps: [
      "Ở Giảng dạy, tìm bài theo tên, ngôn ngữ và trạng thái. Bộ lọc ngôn ngữ dùng bản soạn hiện tại; bài đã có bản xuất bản vẫn có thể đang được sửa nháp.",
      "Trong trang lớp bấm Giao bài, kiểm tra nhãn ngôn ngữ của bài và phiên bản, bấm Lưu vào lớp để học viên đọc được bài. Xuất bản lại không tự đổi phiên bản lớp đang dùng.",
      "Tạo bài giao: Luyện tập cho làm nhiều lượt và xem giải thích ngay; Kiểm tra chỉ một lượt với câu hỏi riêng. Chọn câu, đặt hạn nộp, bấm Xem lại và xuất bản.",
    ],
  },
  {
    id: "teacher-daily",
    title: "Bài luyện hằng ngày",
    steps: [
      "Trong trang lớp, mục Bài luyện hằng ngày: chọn 5, 7, 10 hoặc 15 câu rồi bấm Lưu.",
      "Khoảng 6:00 sáng mỗi ngày, Reng tự giao một bài từ bài học mới nhất của lớp, hạn 23:59 cùng ngày. Câu đổi mỗi ngày và ưu tiên câu học viên chưa gặp gần đây.",
      "Bấm Giao bài hôm nay ngay khi muốn có bài của hôm nay mà không chờ tới sáng mai.",
    ],
  },
  {
    id: "teacher-meet",
    title: "Dạy qua Google Meet",
    steps: [
      "Ở trang Giảng dạy, bấm Trình chiếu cạnh bài cần dạy rồi bấm Toàn màn hình.",
      "Trong Google Meet chọn Trình bày → Một thẻ và chọn thẻ đang chiếu slide.",
      "Chuyển slide bằng phím mũi tên, phím cách hoặc nút Tiếp/Trước. Nghĩa tiếng Việt và câu mẫu hiện dần sau mỗi lần bấm Tiếp để hỏi lớp trước.",
      "Bấm Presenter (hoặc phím S) để mở cửa sổ riêng có ghi chú, slide kế tiếp và đồng hồ; không chia sẻ cửa sổ này. Nút PDF dùng để in bài.",
    ],
    note: "Tài khoản Google miễn phí giới hạn 60 phút cho cuộc gọi từ 3 người; buổi dài hơn cần chia buổi hoặc dùng Google Workspace.",
  },
  {
    id: "teacher-report",
    title: "Theo dõi lớp",
    steps: [
      "Trang lớp cho thấy từng học viên đã nộp bao nhiêu bài, điểm trung bình, lần học gần nhất và nhãn cần chú ý.",
      "Mục Câu cả lớp sai nhiều gợi ý phần cần giảng lại; bấm tên học viên để xem chi tiết, bấm Xuất CSV để lưu điểm.",
      "Bấm Chia sẻ ở một bài để gửi đúng một phiên bản cho giáo viên khác xem hoặc sao chép; ghi chú riêng và dữ liệu lớp không đi kèm.",
    ],
  },
];

const LEARNER_SECTIONS: GuideSection[] = [
  {
    id: "learner-join",
    title: "Tạo tài khoản và vào lớp",
    steps: [
      "Mở trang Vào lớp, nhập mã lớp giáo viên gửi, bấm Vào lớp.",
      "Lần đầu, bấm Tạo tài khoản học viên và nhập họ tên, email, mật khẩu. Mở thư xác nhận và bấm liên kết để kích hoạt tài khoản; bạn quay lại trang vào lớp với mã đã nhập, bấm Vào lớp một lần nữa. Không thấy thư thì kiểm tra Spam hoặc gửi lại thư xác nhận.",
    ],
  },
  {
    id: "learner-study",
    title: "Học bài",
    steps: [
      "Vào Lớp của tôi → chọn lớp → Đọc bài: từ vựng có nút Nghe, mẫu câu có furigana, hội thoại và bảng luyện tập (bấm Xem câu mẫu để kiểm tra mình).",
      "Ôn lại bằng slide hoặc Flashcard từ vựng ở cuối trang bài học.",
    ],
  },
  {
    id: "learner-practice",
    title: "Làm bài tập",
    steps: [
      "Trong trang lớp, chọn bài ở mục Bài tập rồi bấm Bắt đầu làm bài. Bài tự lưu trong lúc làm.",
      "Câu điền tiếng Nhật: gõ chữ Latinh (romaji), hệ thống đổi thành hiragana, ví dụ ko → こ. Chữ ん ở giữa từ gõ nn (さんにん: sannnin); ん ở cuối từ tự hoàn tất khi bạn rời ô.",
      "Bài tiếng Trung: nhập chữ Hán bằng bàn phím tiếng Trung hoặc pinyin có dấu theo yêu cầu câu hỏi; hệ thống không đổi romaji thành kana trong ô chữ Hán/pinyin.",
      "Bài luyện tập có nút Kiểm tra câu này. Bấm Nộp bài để xem điểm và giải thích; còn lượt thì bấm Làm lượt mới.",
      "Mỗi ngày có thể có bài Luyện tập hằng ngày, hạn 23:59 cùng ngày.",
    ],
  },
  {
    id: "learner-review",
    title: "Ôn tập và tiến độ",
    steps: [
      "Ôn tập đưa ra từ vựng và câu đã sai khi tới lịch ôn; Sổ lỗi gom các câu bạn làm sai; Tiến độ của tôi cho thấy bài đã đọc, kết quả bài tập và thẻ ôn tập.",
    ],
  },
];

const QUESTIONS = [
  {
    question: "Quên mật khẩu thì làm sao?",
    answer:
      "Bấm Quên mật khẩu? ở trang Đăng nhập để nhận link đặt lại qua email. Nếu không thấy thư, hãy báo giáo viên hoặc quản trị viên để được hỗ trợ.",
  },
  {
    question: "Không vào được lớp?",
    answer:
      "Kiểm tra lại mã với giáo viên: lớp có thể đã đổi mã, ngừng nhận học viên hoặc đủ chỗ. Nhập sai nhiều lần cần đợi 15 phút rồi thử lại.",
  },
  {
    question: "Nút Nghe không có tiếng?",
    answer:
      "Bài chưa có file đọc mẫu sẽ dùng giọng tiếng Nhật của thiết bị. Cài giọng tiếng Nhật trong phần chuyển văn bản thành giọng nói của điện thoại hoặc máy tính rồi thử lại.",
  },
  {
    question: "Bài giảng của giáo viên có bị công khai không?",
    answer:
      "Không. Bài mới chỉ giáo viên và lớp được giao xem được; công khai hoặc chia sẻ là thao tác riêng do giáo viên chọn.",
  },
];

interface SectionListProps {
  sections: GuideSection[];
}

function SectionList({ sections }: SectionListProps) {
  return sections.map((section) => (
    <section key={section.id} id={section.id} className="guide-section">
      <h3>{section.title}</h3>
      <ol>
        {section.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {section.note && <p className="small muted">{section.note}</p>}
    </section>
  ));
}

export default function GuidePage() {
  return (
    <article className="guide-page">
      <h1>Hướng dẫn sử dụng</h1>
      <p>
        Reng là nơi giáo viên soạn slide, mở lớp, giao bài và theo dõi học viên; buổi học video vẫn
        diễn ra trên Google Meet. Học viên chỉ cần trình duyệt trên điện thoại hoặc máy tính.
      </p>
      <nav className="guide-toc" aria-label="Mục lục hướng dẫn">
        <div>
          <h2>Giáo viên</h2>
          <ul>
            {TEACHER_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Học viên</h2>
          <ul>
            {LEARNER_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
            <li>
              <a href="#faq">Câu hỏi thường gặp</a>
            </li>
          </ul>
        </div>
      </nav>
      <section aria-labelledby="teacher-title">
        <h2 id="teacher-title">Dành cho giáo viên</h2>
        <p>
          Bắt đầu ở <Link href="/sign-up/teacher">Đăng ký giáo viên</Link>; nếu đã có tài khoản, vào{" "}
          <Link href="/teach">Giảng dạy</Link>.
        </p>
        <SectionList sections={TEACHER_SECTIONS} />
      </section>
      <section aria-labelledby="learner-title">
        <h2 id="learner-title">Dành cho học viên</h2>
        <p>
          Bắt đầu ở <Link href="/join-class">Vào lớp</Link> với mã giáo viên gửi.
        </p>
        <SectionList sections={LEARNER_SECTIONS} />
      </section>
      <section aria-labelledby="admin-title" className="guide-section">
        <h2 id="admin-title">Dành cho quản trị viên</h2>
        <p>
          Tài khoản quản trị thấy mục Quản trị trên thanh đầu trang: duyệt hoặc tạm dừng giáo viên,
          ghi hạn thuê và xem nhật ký thao tác. Quyền quản trị do người vận hành cấp trong database,
          không đăng ký được trên trang.
        </p>
      </section>
      <section id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Câu hỏi thường gặp</h2>
        {QUESTIONS.map((item) => (
          <details key={item.question} className="guide-question">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
    </article>
  );
}
