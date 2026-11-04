import Link from "next/link";

import { isGoogleAuthEnabled } from "@/lib/server/supabase";

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
      "Mở trang Đăng ký giáo viên, nhập họ tên, email và mật khẩu (ít nhất 8 ký tự). Bạn được đăng nhập ngay và chuyển tới trang đăng ký giảng dạy. Nếu Reng báo đã gửi thư xác nhận, mở thư, bấm liên kết rồi quay lại trang đó.",
      "Ở trang Đăng ký giảng dạy, đánh dấu ô cam kết rồi bấm Gửi yêu cầu giảng dạy.",
      "Nếu hệ thống yêu cầu duyệt, đợi quản trị viên mở quyền; nếu không, bạn có thể bắt đầu ngay. Mục Giảng dạy hiện trên thanh đầu trang. Một tài khoản vừa dạy vừa học được ở lớp khác.",
      "Đổi họ tên hiển thị với học viên hoặc mật khẩu ở nút Tài khoản cuối trang Giảng dạy.",
      "Mới bắt đầu, trang Giảng dạy có danh sách Các bước bắt đầu dạy (tạo lớp, tạo và xuất bản bài, đưa bài vào lớp, mời học viên, đặt lịch, giao bài tập); danh sách tự ẩn khi lớp đã có học viên và bài tập.",
      "Mục Hôm nay dạy gì ở đầu trang Giảng dạy gom buổi dạy hôm nay theo lịch lớp, bài tập hạn hôm nay và lớp có bài nộp mới trong 24 giờ; bấm từng dòng để mở đúng lớp.",
    ],
  },
  {
    id: "teacher-self-study",
    title: "Vừa dạy vừa tự học",
    steps: [
      "Dùng một tài khoản cho cả hai việc. Muốn tự ôn, vào Giảng dạy → Tạo lớp, đánh dấu Lớp tự học của tôi rồi bấm Tạo lớp: lớp chỉ có bạn là học viên và không có mã mời.",
      "Đưa bài hoặc ngân hàng ôn vào lớp tự học và bật Bài luyện hằng ngày như lớp thường. Bài đến bạn ở mục Lớp của tôi; câu sai vào sổ lỗi và lịch ôn tập của bạn.",
      "Đừng nhập mã lớp bạn đang dạy: Reng không cho chủ lớp làm học viên của lớp đó, để điểm và câu sai của lớp chỉ phản ánh học viên.",
    ],
  },
  {
    id: "teacher-lesson",
    title: "Soạn bài tiếng Nhật",
    steps: [
      "Vào Giảng dạy → Tạo bài mới. Chọn bài mẫu (bài 1 đến 15) và bấm Tạo bài từ mẫu để có sẵn bài theo trình tự Minna no Nihongo Sơ cấp I: từ vựng, mẫu câu, hội thoại, luyện thay thế và 50 câu luyện.",
      "Bài mẫu là bản nháp riêng của bạn. Đọc lại, sửa theo lớp mình rồi bấm Xuất bản; học viên dùng sách của mình để đối chiếu.",
      "Xuất bản xong, mục Dùng bài trong lớp phía trên trình soạn liệt kê các lớp của bạn: bấm Đưa vào lớp (bài mở ngay, xếp cuối danh sách bài của lớp) hoặc Cập nhật lên phiên bản mới cho lớp đang dùng bản cũ.",
      "Bài tiếp theo: bấm Tạo bản sao ở bài đã có rồi sửa nội dung, hoặc soạn từ đầu ở mục Soạn bài tiếng Nhật của trang Tạo bài mới.",
      "Bài mẫu được bổ sung dần (hình, slide, câu luyện) nhưng bài đã tạo không tự cập nhật. Bấm Cập nhật từ mẫu ở bài đó để so sánh và thay bản nháp bằng mẫu mới nhất; chỉnh sửa riêng trong nháp sẽ mất, phiên bản đã xuất bản và lớp đang dùng giữ nguyên.",
    ],
  },
  {
    id: "teacher-chinese",
    title: "Soạn bài tiếng Trung",
    steps: [
      "Ở Tạo bài mới, chọn Soạn bài tiếng Trung. Chọn giản thể hoặc phồn thể, mẫu bài và mục tiêu nhỏ đầu tiên.",
      "Đi qua năm bước: mục tiêu, từ vựng, mẫu câu và hội thoại, câu luyện, slide và xuất bản. Bước Từ vựng cho dán bảng chữ Hán – pinyin – nghĩa Việt từ Excel; CSV tiếng Nhật là công cụ riêng.",
      "Duyệt từng đáp án trước khi xuất bản. Pinyin cần đúng dấu thanh và khoảng trắng; giản thể và phồn thể không tự đổi cho nhau.",
      "Ngoài câu tạo từ từ vựng, bấm Thêm câu sắp xếp để học viên xếp các mảnh thành câu, hoặc thêm đoạn văn cho một câu để luyện đọc hiểu.",
    ],
  },
  {
    id: "teacher-editor",
    title: "Soạn và sửa slide",
    steps: [
      "Editor có các mục Thông tin bài, Từ vựng, Ngữ pháp (mẫu câu và câu ví dụ), Câu luyện và Slide; khung bên cạnh xem trước đúng như khi chiếu.",
      "Thêm slide bằng cách chọn loại: tiêu đề, từ vựng (tối đa 8 từ), mẫu câu, câu ví dụ, hội thoại, bảng / luyện thay thế, câu luyện, ghi chú hoặc ảnh. Kéo hoặc dùng mũi tên để đổi thứ tự.",
      "Furigana viết {漢字|かんじ}, ví dụ {郵便局|ゆうびんきょく}. Bảng có thể dán từ Excel hoặc gõ các ô cách nhau bằng dấu |; bật luyện thay thế để ẩn câu mẫu và hiện từng hàng khi dạy.",
      "Câu luyện có trắc nghiệm, điền, sắp xếp câu, nghe và chính tả. Câu nghe chỉ xuất bản được khi đã có audio; Reng chưa tạo audio ngay trên trình soạn, nên cần quản trị viên tạo giúp. Câu sắp xếp: ghi các mảnh theo đúng thứ tự câu, mỗi dòng một mảnh, không để hai mảnh giống nhau. Câu đọc hiểu: bấm Thêm đoạn văn đọc hiểu, rồi Thêm câu hỏi cho đoạn văn này để hỏi tiếp về cùng đoạn văn. Câu kiểm tra riêng ở trang Giao bài cũng có hai dạng này.",
      "Ghi chú giảng viên chỉ hiện ở cửa sổ Presenter. Bấm Lưu nháp thường xuyên (rời trang khi còn thay đổi chưa lưu, Reng sẽ hỏi lại); Xuất bản tạo phiên bản mới, lớp chỉ chuyển sang phiên bản mới khi bạn chọn trong trang Giao bài.",
    ],
  },
  {
    id: "teacher-class",
    title: "Mở lớp và mời học viên",
    steps: [
      "Vào Giảng dạy → Tạo lớp: nhập tên lớp, chọn Tiếng Nhật, Tiếng Trung giản thể hoặc Tiếng Trung phồn thể theo lớp, số học viên tối đa (để trống nếu không giới hạn) và link Google Meet dạng https://meet.google.com/abc-defg-hij.",
      "Ở trang lớp, bấm Sao chép link mời rồi gửi cho học viên qua Zalo/Messenger; học viên mở link là mã lớp được điền sẵn. Vẫn có thể gửi riêng mã lớp. Đổi mã mới hoặc Ngừng nhận học viên khi cần.",
      "Xóa học viên khỏi lớp: bấm tên học viên ở trang lớp, rồi Xóa khỏi lớp và Xác nhận xóa. Điểm và bài đã nộp vẫn giữ trong báo cáo. Học viên còn mã lớp thì vào lại được; muốn chặn thì đổi mã lớp.",
      "Đặt lịch học: ở mục Lịch học của trang lớp, bấm Thêm buổi trong tuần, chọn thứ, giờ bắt đầu và thời lượng (giờ Việt Nam), thêm ghi chú nếu nghỉ hoặc học bù, rồi bấm Lưu lịch học. Học viên thấy buổi tới ở trang lớp và ở Lớp của tôi.",
    ],
  },
  {
    id: "teacher-assign",
    title: "Đưa bài vào lớp và giao bài tập",
    steps: [
      "Ở Giảng dạy, tìm bài theo tên, ngôn ngữ và trạng thái. Bộ lọc ngôn ngữ dùng bản soạn hiện tại; bài đã có bản xuất bản vẫn có thể đang được sửa nháp.",
      "Trong trang lớp bấm Giao bài, kiểm tra nhãn ngôn ngữ của bài và phiên bản, bấm Lưu vào lớp để học viên đọc được bài. Xuất bản lại không tự đổi phiên bản lớp đang dùng; cách nhanh nhất là mục Dùng bài trong lớp của trình soạn. Ở đây bạn chọn được thứ tự và hẹn giờ mở.",
      "Tạo bài giao: Luyện tập cho làm nhiều lượt và xem giải thích ngay; Kiểm tra chỉ một lượt với câu hỏi riêng. Chọn câu, đặt hạn nộp, bấm Xem lại và xuất bản.",
    ],
  },
  {
    id: "teacher-daily",
    title: "Bài luyện hằng ngày",
    steps: [
      "Trong trang lớp, mục Bài luyện hằng ngày: chọn 5, 7, 10, 15, 20, 30, 40 hoặc 60 câu và bài ở ô Lấy câu từ (ví dụ ngân hàng ôn), rồi bấm Lưu. Để Tự động thì Reng lấy bài mới nhất đã mở có câu hỏi, nên thêm bài mới vào lớp sẽ đổi nguồn.",
      "Khoảng 6:00 sáng mỗi ngày, Reng tự giao một bài từ bài đã chọn, hạn 23:59 cùng ngày. Câu đổi mỗi ngày và ưu tiên câu học viên chưa gặp gần đây. Nếu bài nguồn có ít câu hơn số câu mỗi ngày, trang lớp sẽ cảnh báo vì học viên gặp lại toàn bộ câu mỗi ngày.",
      "Bấm Giao bài hôm nay ngay khi muốn có bài của hôm nay mà không chờ tới sáng mai.",
    ],
  },
  {
    id: "teacher-meet",
    title: "Dạy qua Google Meet",
    steps: [
      "Mở trang lớp. Khối Buổi dạy online ở đầu trang có Mở Google Meet và Trình chiếu tiếp từ slide đã dạy tới, đúng phiên bản bài của lớp. Buổi đầu, bấm Trình chiếu ở bài cần dạy trong mục Nội dung lớp. Bấm Toàn màn hình.",
      "Trong Google Meet chọn Trình bày → Một thẻ và chọn thẻ đang chiếu slide.",
      "Chuyển slide bằng phím mũi tên, phím cách hoặc nút Tiếp/Trước. Nghĩa tiếng Việt và câu mẫu hiện dần sau mỗi lần bấm Tiếp để hỏi lớp trước.",
      "Bấm Presenter (hoặc phím S) để mở cửa sổ riêng có ghi chú, slide kế tiếp và đồng hồ; không chia sẻ cửa sổ này. Nút PDF dùng để in bài.",
      "Hết buổi, bấm Ghi buổi dạy (slide …) trên thanh trình chiếu: Nhật ký buổi dạy ở trang lớp mở ra với bài và slide điền sẵn; thêm ghi chú riêng rồi bấm Ghi buổi dạy. Buổi sau bấm Trình chiếu tiếp ở khối Buổi dạy online để chiếu đúng chỗ.",
    ],
    note: "Tài khoản Google miễn phí giới hạn 60 phút cho cuộc gọi từ 3 người; buổi dài hơn cần chia buổi hoặc dùng Google Workspace.",
  },
  {
    id: "teacher-report",
    title: "Theo dõi lớp",
    steps: [
      "Trang lớp cho thấy từng học viên đã nộp bao nhiêu bài, điểm trung bình, lần học gần nhất và nhãn cần chú ý.",
      "Mục Câu cả lớp sai nhiều gợi ý phần cần giảng lại: mỗi bài giao là một nhóm, bài mới nhất mở sẵn, bấm tên bài để xem các bài trước; số bên phải là số học viên sai trên số học viên đã nộp. Mục Bài đã giao hiện 5 bài mới nhất, bài cũ hơn nằm trong Bài cũ hơn. Bấm tên học viên để xem từng bài đã giao (mỗi bài một nhóm, lọc Sai/Đúng cho mọi bài), bấm Xuất CSV để lưu điểm.",
      "Bấm Chia sẻ ở một bài để gửi đúng một phiên bản cho giáo viên khác xem hoặc sao chép; ghi chú riêng và dữ liệu lớp không đi kèm.",
    ],
  },
];

const LEARNER_SECTIONS: GuideSection[] = [
  {
    id: "learner-join",
    title: "Tạo tài khoản và vào lớp",
    steps: [
      "Mở link mời giáo viên gửi (mã lớp được điền sẵn), hoặc mở trang Vào lớp và nhập mã lớp, rồi bấm Vào lớp.",
      "Lần đầu, bấm Tạo tài khoản học viên và nhập họ tên, email, mật khẩu. Bạn được đăng nhập ngay và quay lại trang vào lớp với mã đã nhập; bấm Vào lớp một lần nữa. Nếu Reng báo đã gửi thư xác nhận, mở thư và bấm liên kết trước (không thấy thư thì xem mục Spam hoặc gửi lại thư).",
      "Muốn rời lớp, mở trang lớp và bấm Rời lớp ở cuối trang. Kết quả đã nộp vẫn được giữ; muốn học lại thì nhập mã lớp giáo viên gửi.",
    ],
  },
  {
    id: "learner-study",
    title: "Học bài",
    steps: [
      "Mở Lớp của tôi (hoặc trang chủ khi đã đăng nhập) để xem Hôm nay học gì: buổi học hôm nay, bài đang làm dở, bài đến hạn hôm nay, bài mới mở trong tuần và thẻ đến hạn ôn. Bấm nút ở từng dòng để làm ngay; xong việc nào thì việc đó tự rời danh sách.",
      "Lớp của tôi và trang lớp hiện buổi học tới theo lịch giáo viên đặt; tới giờ thì bấm Vào Google Meet ở trang lớp.",
      "Vào Lớp của tôi → chọn lớp → Đọc bài: từ vựng có nút Nghe, mẫu câu có furigana, hội thoại và bảng luyện tập (bấm Xem câu mẫu để kiểm tra mình).",
      "Ôn lại bằng slide hoặc Flashcard từ vựng ở cuối trang bài học.",
    ],
  },
  {
    id: "learner-practice",
    title: "Làm bài tập",
    steps: [
      "Ở Lớp của tôi (hoặc trang lớp), bấm Làm bài cạnh bài ở mục Bài tập cần làm rồi bấm Bắt đầu làm bài. Bài tự lưu trong lúc làm; bài đang làm dở hiện nút Làm tiếp.",
      "Câu điền tiếng Nhật: gõ chữ Latinh (romaji), hệ thống đổi thành hiragana, ví dụ ko → こ. Chữ ん ở giữa từ gõ nn (さんにん: sannnin); ん ở cuối từ tự hoàn tất khi bạn rời ô.",
      "Bài tiếng Trung: nhập chữ Hán bằng bàn phím tiếng Trung hoặc pinyin có dấu theo yêu cầu câu hỏi; hệ thống không đổi romaji thành kana trong ô chữ Hán/pinyin.",
      "Câu sắp xếp: bấm các mảnh theo đúng thứ tự câu; bấm một mảnh đã xếp để bỏ ra, hoặc Xếp lại từ đầu. Câu đọc hiểu có đoạn văn ngay trên đề; các câu cùng đoạn văn nằm liền nhau.",
      "Bài luyện tập có nút Kiểm tra câu này; gõ xong bấm Enter để kiểm tra, bấm Enter lần nữa để sang câu sau. Bài dài có Danh sách câu để nhảy tới câu bất kỳ; khi nộp mà còn câu trống, bấm Đến câu chưa làm.",
      "Bấm Nộp bài để xem điểm và giải thích. Bài luyện tập có câu sai sẽ mở sẵn các câu sai; bấm Tất cả hoặc Đúng để xem câu khác. Còn lượt thì bấm Làm lượt mới.",
      "Mỗi ngày có thể có bài Luyện tập hằng ngày, hạn 23:59 cùng ngày.",
    ],
  },
  {
    id: "learner-account",
    title: "Tài khoản",
    steps: [
      "Ở cuối trang Lớp của tôi, bấm Tài khoản để đổi họ tên hiển thị hoặc đặt mật khẩu mới. Đổi mật khẩu sẽ đăng xuất các thiết bị khác.",
    ],
  },
  {
    id: "learner-review",
    title: "Ôn tập và tiến độ",
    steps: [
      "Ôn tập đưa ra từ vựng và câu đã sai khi tới lịch ôn; Sổ lỗi gom các câu bạn làm sai; Tiến độ của tôi cho thấy bài đã đọc, kết quả bài tập và thẻ ôn tập. Ba nút này nằm ở mục Ôn lại và tiến độ trong Lớp của tôi.",
      "Lịch sử Sheet chỉ hiện khi bạn có kết quả cũ được nhập từ Google Sheet. Đó là bản lưu, không nhận bài mới: bài hằng ngày và điểm mới nằm ở Lớp của tôi và Tiến độ của tôi.",
    ],
  },
];

const QUESTIONS = [
  {
    question: "Quên mật khẩu thì làm sao?",
    answer:
      "Bấm Quên mật khẩu? ở trang Đăng nhập. Nếu trang có nút Đăng nhập bằng Google và email của bạn là Gmail, bấm nút đó để vào ngay. Nếu không, nhập email để nhận link đặt lại; không thấy thư thì báo giáo viên hoặc quản trị viên để được cấp mật khẩu tạm, rồi đổi lại ở trang Tài khoản.",
  },
  {
    question: "Không vào được lớp?",
    answer:
      "Kiểm tra lại mã với giáo viên: lớp có thể đã đổi mã, ngừng nhận học viên hoặc đủ chỗ. Nhập sai nhiều lần cần đợi 15 phút rồi thử lại.",
  },
  {
    question: "Nút Nghe không có tiếng?",
    answer:
      "Bài chưa có file đọc mẫu sẽ dùng giọng đọc của thiết bị theo ngôn ngữ của bài. Cài giọng tiếng Nhật hoặc tiếng Trung trong phần chuyển văn bản thành giọng nói của điện thoại hoặc máy tính rồi thử lại.",
  },
  {
    question: "Bài giảng của giáo viên có bị công khai không?",
    answer:
      "Không. Bài mới chỉ giáo viên và lớp được giao xem được; công khai hoặc chia sẻ là thao tác riêng do giáo viên chọn.",
  },
];

// Google sign-in shows only where the deployment enabled it, so the guide mentions it the same way.
const GOOGLE_SIGN_IN_NOTE =
  "Có tài khoản Google? Bấm Đăng ký bằng Google hoặc Đăng nhập bằng Google thay cho họ tên, email và mật khẩu.";
const GOOGLE_SIGN_IN_SECTIONS = new Set(["teacher-sign-up", "learner-join"]);

function withGoogleNote(sections: GuideSection[]) {
  if (!isGoogleAuthEnabled()) {
    return sections;
  }
  return sections.map((section) =>
    GOOGLE_SIGN_IN_SECTIONS.has(section.id) ? { ...section, note: GOOGLE_SIGN_IN_NOTE } : section,
  );
}

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
        diễn ra trên Google Meet. Học viên chỉ cần trình duyệt trên điện thoại hoặc máy tính. Trên
        điện thoại, các mục nằm trong nút Menu ở góc trên; Lớp của tôi (giáo viên: Giảng dạy) luôn ở
        ngay cạnh nút đó.
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
        <SectionList sections={withGoogleNote(TEACHER_SECTIONS)} />
      </section>
      <section aria-labelledby="learner-title">
        <h2 id="learner-title">Dành cho học viên</h2>
        <p>
          Bắt đầu ở <Link href="/join-class">Vào lớp</Link> với mã giáo viên gửi.
        </p>
        <SectionList sections={withGoogleNote(LEARNER_SECTIONS)} />
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
