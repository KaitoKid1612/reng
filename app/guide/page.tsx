import Link from "next/link";

import { isGoogleAuthEnabled } from "@/lib/server/supabase";

import type { Metadata } from "next";

const DESCRIPTION =
  "Hướng dẫn dùng Reng cho giáo viên và học viên: tạo bài từ mẫu, mở lớp, dạy qua Google Meet, giao bài, bài luyện hằng ngày và đề thi thử JLPT, vào lớp bằng mã, làm bài, ôn tập và tự học.";

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
      "Mở trang Đăng ký giáo viên, nhập họ tên, email và mật khẩu (ít nhất 8 ký tự). Bạn được đăng nhập ngay và chuyển tới trang Bắt đầu giảng dạy. Nếu Reng báo đã gửi thư xác nhận, mở thư, bấm liên kết rồi quay lại trang đó.",
      "Ở trang Bắt đầu giảng dạy, đánh dấu ô cam kết rồi bấm Gửi yêu cầu giảng dạy (nút ghi Kích hoạt giảng dạy khi Reng không cần duyệt giáo viên mới).",
      "Nếu hệ thống yêu cầu duyệt, đợi quản trị viên mở quyền; nếu không, bạn có thể bắt đầu ngay. Mục Giảng dạy hiện trên thanh đầu trang. Một tài khoản vừa dạy vừa học được ở lớp khác.",
      "Đổi họ tên hiển thị với học viên hoặc mật khẩu ở nút Tài khoản cuối trang Giảng dạy.",
      "Mới bắt đầu, trang Giảng dạy có danh sách Các bước bắt đầu dạy (tạo lớp, tạo và xuất bản bài, đưa bài vào lớp, mời học viên, đặt lịch, giao bài tập); danh sách tự ẩn khi lớp đã có học viên và bài tập.",
      "Mục Hôm nay dạy gì ở đầu trang Giảng dạy gom buổi dạy hôm nay theo lịch lớp, bài tập hạn hôm nay và lớp có bài nộp mới trong 24 giờ; bấm từng dòng để mở đúng lớp. Trang chủ cũng hiện mục này khi bạn đăng nhập.",
    ],
  },
  {
    id: "teacher-self-study",
    title: "Vừa dạy vừa tự học",
    steps: [
      "Dùng một tài khoản cho cả hai việc. Muốn tự ôn, vào Giảng dạy → Tạo lớp, đánh dấu Lớp tự học của tôi rồi bấm Tạo lớp: lớp chỉ có bạn là học viên và không có mã mời.",
      "Đưa bài hoặc ngân hàng ôn vào lớp tự học và bật Bài luyện hằng ngày như lớp thường. Bài đến bạn ở mục Lớp đang học trên thanh đầu trang; câu sai vào sổ lỗi và lịch ôn tập của bạn.",
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
      "Bài tiếp theo: bấm Tạo bản sao ở bài đã có rồi sửa nội dung, hoặc dùng mục Soạn bài tiếng Nhật từ đầu ở trang Tạo bài mới.",
      "Bài mẫu được bổ sung dần (hình, slide, câu luyện) nhưng bài đã tạo không tự cập nhật. Khi bản nháp khác bài mẫu mới nhất, đầu trình soạn có link so sánh và cập nhật từ mẫu: trang so sánh ghi từng phần (từ vựng, mẫu câu, slide, câu luyện, hình) giống hay khác mẫu, rồi cho thay bản nháp bằng mẫu mới nhất; chỉnh sửa riêng trong nháp sẽ mất, phiên bản đã xuất bản và lớp đang dùng giữ nguyên.",
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
      "Editor có các mục Thông tin bài, Từ vựng, Ngữ pháp (mẫu câu và câu ví dụ), Câu luyện và Slide; khung bên cạnh xem trước đúng như khi chiếu. Nhiều từ vựng một lúc: lưu nháp rồi bấm Nhập nhiều từ từ CSV/Excel ở mục Từ vựng.",
      "Thêm slide bằng cách chọn loại: tiêu đề, từ vựng (tối đa 8 từ), mẫu câu, câu ví dụ, hội thoại, bảng / luyện thay thế, câu luyện, ghi chú hoặc ảnh. Kéo hoặc dùng mũi tên để đổi thứ tự.",
      "Furigana viết {漢字|かんじ}, ví dụ {郵便局|ゆうびんきょく}; câu luyện cũng dùng được ở đề, lựa chọn và giải thích, trừ chữ đang hỏi cách đọc. Bảng có thể dán từ Excel hoặc gõ các ô cách nhau bằng dấu |; bật luyện thay thế để ẩn câu mẫu và hiện từng hàng khi dạy.",
      "Câu luyện có trắc nghiệm, điền, sắp xếp câu, ghép đôi, nghe và chính tả. Câu ghép đôi soạn thành hai cột, mỗi dòng một cặp (cột trái, cột phải cùng dòng là cặp đúng), 2–8 cặp; học viên nhận cột phải đã xáo trộn. Bài 1–15 có sẵn câu nghe: ở mục Câu luyện, khung Câu nghe Minna có sẵn, chọn Bài N rồi bấm Thêm 6 câu nghe (đã có audio). Câu nghe tự soạn chỉ xuất bản được khi đã có audio; Reng chưa tạo audio ngay trên trình soạn, nên cần quản trị viên tạo giúp. Khung Câu luyện kanji có nút Tạo câu kanji cho N từ, làm câu đọc và viết chữ Hán từ bảng từ vựng. Câu sắp xếp: ghi các mảnh theo đúng thứ tự câu, mỗi dòng một mảnh, không để hai mảnh giống nhau. Câu đọc hiểu: bấm Thêm đoạn văn đọc hiểu, rồi Thêm câu hỏi cho đoạn văn này để hỏi tiếp về cùng đoạn văn. Câu kiểm tra riêng ở trang Giao bài cũng có hai dạng này.",
      "Ghi chú giáo viên chỉ hiện ở cửa sổ Presenter. Bấm Lưu nháp thường xuyên (rời trang khi còn thay đổi chưa lưu, Reng sẽ hỏi lại); Xuất bản tạo phiên bản mới; lớp đang dùng bản cũ chỉ chuyển sang khi bạn bấm Cập nhật lên phiên bản mới ở mục Dùng bài trong lớp.",
    ],
  },
  {
    id: "teacher-class",
    title: "Mở lớp và mời học viên",
    steps: [
      "Vào Giảng dạy → Tạo lớp: nhập tên lớp, chọn Tiếng Nhật, Tiếng Trung giản thể hoặc Tiếng Trung phồn thể theo lớp, số học viên tối đa (để trống nếu không giới hạn) và link Google Meet dạng https://meet.google.com/abc-defg-hij.",
      "Ở trang lớp, bấm Sao chép link mời rồi gửi cho học viên qua Zalo/Messenger; học viên mở link là mã lớp được điền sẵn. Vẫn có thể gửi riêng mã lớp. Đổi mã mới hoặc Ngừng nhận học viên khi cần.",
      "Xóa học viên khỏi lớp: bấm tên học viên ở trang lớp, rồi Xóa khỏi lớp và Xác nhận xóa. Điểm và bài đã nộp vẫn giữ trong báo cáo. Học viên còn mã lớp thì vào lại được; muốn chặn thì đổi mã lớp.",
      "Ở mục Cài đặt lớp: đổi Điểm đạt của lớp (%), link Google Meet, hoặc bỏ chọn Lớp đang hoạt động để lưu trữ lớp (học viên không vào lớp và không bắt đầu bài mới được nữa).",
      "Đặt lịch học: ở mục Lịch học của trang lớp, bấm Thêm buổi trong tuần, chọn thứ, giờ bắt đầu và thời lượng (giờ Việt Nam), thêm ghi chú nếu nghỉ hoặc học bù, rồi bấm Lưu lịch học. Học viên thấy buổi tới ở trang lớp và ở Lớp của tôi.",
    ],
  },
  {
    id: "teacher-assign",
    title: "Đưa bài vào lớp và giao bài tập",
    steps: [
      "Ở Giảng dạy, tìm bài theo tên, ngôn ngữ và trạng thái. Bộ lọc ngôn ngữ dùng bản soạn hiện tại; bài đã có bản xuất bản vẫn có thể đang được sửa nháp.",
      "Trong trang lớp, ở mục Nội dung lớp bấm Thêm bài hoặc đổi phiên bản, lịch mở, kiểm tra nhãn ngôn ngữ của bài và phiên bản, bấm Lưu vào lớp để học viên đọc được bài. Mỗi lần xuất bản tạo một phiên bản mới; ô phiên bản chỉ hiện bản mới nhất và bản lớp đang dùng, đánh dấu Hiện phiên bản cũ khi cần bản khác. Phiên bản cũ không xóa được vì bài đã giao và bài học viên đã nộp vẫn dùng nó. Xuất bản lại không tự đổi phiên bản lớp đang dùng; cách nhanh nhất là mục Dùng bài trong lớp của trình soạn. Ở đây bạn chọn được thứ tự và hẹn giờ mở.",
      'Tạo bài giao (nút Giao bài ở đầu trang lớp): Luyện tập cho làm nhiều lượt và xem giải thích ngay; Kiểm tra chỉ một lượt với câu hỏi riêng, chọn Công bố kết quả Ngay sau khi nộp hoặc Sau hạn nộp. Chọn câu (bài có câu nghe thì có nút Chỉ chọn câu nghe), đặt hạn nộp và Cho phép nộp muộn hay không, bấm Xem lại trước khi giao rồi Giao bài cho lớp. Bài không cho nộp muộn mà học viên bỏ dở (chưa bấm Nộp) được Reng tự nộp khoảng 6 giờ sáng sau hạn với các câu đã lưu; trang học viên ghi rõ "Reng tự nộp". Giao xong, bấm Sao chép tin nhắn cho nhóm lớp để dán tên bài, hạn nộp và link vào nhóm Zalo/Messenger; mỗi bài còn mở trong mục Bài đã giao có nút Sao chép tin nhắn giao bài để nhắc lại. Nút Đóng bài kết thúc bài sớm: sau Xác nhận đóng, không ai nộp được nữa, kể cả lượt đang làm.',
      "Đề bị sai hoặc khó đọc sau khi đã giao (kể cả bài luyện hằng ngày): ở trang lớp bấm Xem câu hỏi, sửa lỗi hiển thị cạnh bài, rồi bấm Sửa ở câu cần sửa: khung Trước là câu học viên đang thấy, khung Sau là bản sửa (trên điện thoại hai khung xếp trên dưới). Sửa được đề bài và giải thích; furigana thì gõ cách đọc vào ô cạnh từng chữ Hán (gõ romaji tự ra hiragana). Đáp án, lựa chọn và thứ tự câu giữ nguyên nên bài học viên đang làm và điểm không đổi. Sửa cả trong bài nguồn để các bài giao sau không lặp lỗi.",
    ],
  },
  {
    id: "teacher-daily",
    title: "Bài luyện hằng ngày",
    steps: [
      "Trong trang lớp, mục Bài luyện hằng ngày: chọn 5, 7, 10, 15, 20, 30, 40, 60 hoặc 70 câu và bài ở ô Lấy câu từ (ví dụ ngân hàng ôn), rồi bấm Lưu. Để Tự động thì Reng lấy bài mới nhất đã mở có câu hỏi, nên thêm bài mới vào lớp sẽ đổi nguồn.",
      "Ô Số câu nghe mỗi ngày: để Theo tỉ lệ của bài thì câu nghe xuất hiện theo tỉ lệ có trong bài nguồn; chọn 0 để bỏ câu nghe (ví dụ học viên không nghe được ở lớp); chọn 1–10 để mỗi ngày có tối đa chừng ấy câu nghe, nằm trong tổng số câu. Bài nguồn ít câu nghe hơn số đã chọn thì Reng bù bằng câu thường.",
      "Khoảng 6:00 sáng mỗi ngày, Reng tự giao một bài từ bài đã chọn, hạn 23:59 cùng ngày; học viên nộp muộn vẫn được, tối đa 3 lượt. Câu đổi mỗi ngày và ưu tiên câu học viên chưa gặp gần đây. Nếu bài nguồn có ít câu hơn số câu mỗi ngày, trang lớp sẽ cảnh báo vì học viên gặp lại toàn bộ câu mỗi ngày.",
      "Bấm Giao bài hôm nay ngay khi muốn có bài của hôm nay mà không chờ tới sáng mai.",
    ],
  },
  {
    id: "teacher-jlpt",
    title: "Thi thử JLPT",
    steps: [
      "Lớp tiếng Nhật cần có ngân hàng ôn N5 hoặc N4 trong Nội dung lớp: câu có nhãn chữ Hán, từ vựng, ngữ pháp hoặc đọc hiểu, và câu nghe có audio. Ngân hàng ôn do quản trị viên nạp vào tài khoản của bạn; chưa có thì liên hệ quản trị viên trước. Bài mẫu 1–15 không đủ làm đề: chỉ câu kanji và câu nghe Minna của bài có nhãn phần.",
      "Mở Giao bài, bấm Tạo đề thi thử JLPT ở đầu trang (hoặc cuộn tới mục Thi thử JLPT).",
      "Chọn cấp N5 hoặc N4 và bài ở ô Lấy câu từ. Reng ghi trước đề sẽ có bao nhiêu câu mỗi phần (chữ Hán – từ vựng, ngữ pháp – đọc hiểu, nghe hiểu) và báo khi bài có ít câu hơn đề thật; đề sau ưu tiên câu chưa ra ở các đề trước của lớp.",
      "Thời gian làm bài mặc định như đề thật (N5 90 phút, N4 115 phút) và tính riêng cho từng học viên từ lúc bấm Bắt đầu thi. Ô Mở đến là hạn bắt đầu thi; Công bố điểm chọn ngay sau khi nộp hoặc sau hạn để cả lớp xem cùng lúc. Bấm Giao đề thi thử.",
      "Đề là bài kiểm tra một lượt, không nộp muộn. Như đề thật, mỗi câu nghe chỉ phát một lần, không dừng, tua hay nghe chậm. Kết quả của học viên có điểm từng phần và điểm ước tính trên thang 180.",
      "Bấm tên học viên trong trang lớp: bảng Thi thử JLPT liệt kê mọi đề người đó đã nộp, mới nhất ở trên, với điểm ngôn ngữ và đọc hiểu, nghe hiểu, tổng (kèm tăng giảm so với lần trước cùng cấp) và ước tính đỗ hoặc phần còn thiếu.",
    ],
    note: "Điểm thang 180 là ước tính từ tỉ lệ đúng; điểm JLPT thật tính theo độ khó từng câu nên có thể khác.",
  },
  {
    id: "teacher-meet",
    title: "Dạy qua Google Meet",
    steps: [
      "Mở trang lớp. Khối Buổi dạy online ở đầu trang có Mở Google Meet và Trình chiếu tiếp từ slide đã dạy tới, đúng phiên bản bài của lớp. Buổi đầu, bấm Trình chiếu ở bài cần dạy trong mục Nội dung lớp. Bấm Toàn màn hình.",
      "Trong Google Meet chọn Trình bày → Một thẻ và chọn thẻ đang chiếu slide.",
      "Chuyển slide bằng phím mũi tên, phím cách hoặc nút Tiếp/Trước. Nghĩa tiếng Việt và câu mẫu hiện dần sau mỗi lần bấm Tiếp để hỏi lớp trước.",
      "Bấm Presenter (hoặc phím S) để mở cửa sổ riêng có ghi chú, slide kế tiếp và đồng hồ; không chia sẻ cửa sổ này. Nút PDF dùng để in bài.",
      "Trong cửa sổ Presenter, phím mũi tên, Page Up/Page Down, phím cách và bút trình chiếu cũng chuyển slide của thẻ đang chiếu.",
      "Hết buổi, bấm Ghi buổi dạy (slide …) trên thanh trình chiếu: Nhật ký buổi dạy mở ở thẻ mới với bài và slide điền sẵn, nên thẻ đang chia sẻ trong Meet vẫn là slide và học viên không thấy điểm của lớp. Thêm ghi chú riêng rồi bấm Ghi buổi dạy. Ngay dưới buổi vừa ghi là mục Điểm danh: bỏ chọn học viên vắng rồi bấm Lưu điểm danh (học viên không thấy); danh sách buổi ghi ai hay vắng. Buổi sau bấm Trình chiếu tiếp ở khối Buổi dạy online để chiếu đúng chỗ.",
    ],
    note: "Tài khoản Google miễn phí giới hạn 60 phút cho cuộc gọi từ 3 người; buổi dài hơn cần chia buổi hoặc dùng Google Workspace.",
  },
  {
    id: "teacher-report",
    title: "Theo dõi lớp",
    steps: [
      "Trang lớp cho thấy từng học viên đã nộp bao nhiêu bài, điểm trung bình, lần học gần nhất và nhãn cần chú ý.",
      "Mục Câu cả lớp sai nhiều gợi ý phần cần giảng lại: mỗi bài giao là một nhóm, bài mới nhất mở sẵn, bấm tên bài để xem các bài trước; số bên phải là số học viên sai trên số học viên đã nộp. Mục Bài đã giao hiện 5 bài mới nhất, bài cũ hơn nằm trong Bài cũ hơn. Bấm tên học viên để xem từng bài đã giao (mỗi bài một nhóm, lọc Sai/Đúng cho mọi bài). Nút Xuất CSV ở đầu trang lớp lưu điểm cả lớp.",
      "Mỗi bài trong mục Bài đã giao ghi tên học viên chưa nộp; bấm tên để mở trang của học viên đó.",
      "Ở trang một học viên: mục Luyện tập hằng ngày có điểm từng ngày (bấm một ngày để mở câu trả lời của ngày đó); câu điền đúng ý nhưng khác chữ có nút Chấp nhận câu trả lời này để cộng điểm cho mọi học viên trả lời giống vậy.",
    ],
  },
  {
    id: "teacher-share",
    title: "Chia sẻ, công khai và lưu trữ bài",
    steps: [
      "Ở trang Giảng dạy, bấm Chia sẻ cạnh một bài để gửi đúng một phiên bản cho giáo viên khác xem hoặc sao chép. Người nhận phải là giáo viên đã được mở quyền; ghi chú riêng và dữ liệu lớp không đi kèm.",
      "Bài người khác chia sẻ cho bạn nằm ở Giảng dạy → Bài được chia sẻ với tôi: mở để xem, hoặc bấm Sao chép thành bài của tôi để có bản nháp riêng.",
      "Muốn người chưa có tài khoản cũng đọc được bài (ở trang Bài học công khai), trong trình soạn bấm dòng Quyền đọc (dưới phần xem trước, hoặc cuối bước Slide & xuất bản của bài tiếng Trung), chọn Công khai trên website rồi bấm Lưu quyền đọc.",
      "Bài không dùng nữa: bấm Lưu trữ ở trang Giảng dạy; bài chuyển xuống Bài đã lưu trữ, bấm Đưa trở lại khi cần. Gỡ khỏi lớp ở mục Nội dung lớp chỉ đóng bài với lớp đó, bài vẫn còn trong danh sách của bạn.",
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
      "Mở Lớp của tôi (hoặc trang chủ khi đã đăng nhập) để xem Hôm nay học gì: buổi học hôm nay, bài đang làm dở, bài đến hạn hôm nay, bài mới mở trong tuần và thẻ đến hạn ôn. Bấm nút ở từng dòng để làm ngay; xong việc nào thì việc đó rời danh sách. Bài mới mở rời danh sách khi bạn bấm Đánh dấu đã đọc xong ở cuối bài hoặc ở slide cuối. Trang chủ còn có chuỗi ngày học: chỉ cần ôn một thẻ hoặc nộp một bài mỗi ngày là giữ được chuỗi; Lớp của tôi cho biết mỗi lớp bạn đã nộp bao nhiêu bài.",
      "Lớp của tôi và trang lớp hiện buổi học tới theo lịch giáo viên đặt; tới giờ thì bấm Vào Google Meet ở trang lớp.",
      "Vào Lớp của tôi → chọn lớp → Đọc bài: từ vựng có nút Nghe, mẫu câu có furigana, hội thoại và bảng luyện tập (bấm Xem câu mẫu để kiểm tra mình).",
      "Cuối trang bài học có Flashcard từ vựng, Luyện nghe và Luyện kanji (lớp tiếng Trung: Luyện chữ Hán) khi bài có từ và câu nghe; trang lớp có các nút này cạnh từng bài. Ở Flashcard, chấm Quên, Khó, Được hoặc Dễ để Reng hẹn ngày ôn ở mục Ôn tập.",
      "Mở lại slide của bài là vào đúng slide bạn xem lần trước.",
    ],
  },
  {
    id: "learner-practice",
    title: "Làm bài tập",
    steps: [
      "Ở Lớp của tôi (hoặc trang lớp), bấm Làm bài cạnh bài ở mục Bài tập cần làm rồi bấm Bắt đầu làm bài. Bài tự lưu trong lúc làm; bài đang làm dở hiện nút Làm tiếp.",
      "Câu điền tiếng Nhật: gõ chữ Latinh (romaji), hệ thống đổi thành hiragana, ví dụ ko → こ. Chữ ん ở giữa từ gõ nn (さんにん: sannnin); ん ở cuối từ tự hoàn tất khi bạn rời ô. Trợ từ は, へ, を gõ ha, he, wo.",
      "Bài tiếng Trung: nhập chữ Hán bằng bàn phím tiếng Trung hoặc pinyin có dấu theo yêu cầu câu hỏi; không có dấu trên bàn phím thì gõ số thanh sau mỗi âm (ni3 hao3 → nǐ hǎo, v thay cho ü). Hệ thống không đổi romaji thành kana trong ô chữ Hán/pinyin.",
      "Câu sắp xếp: bấm các mảnh theo đúng thứ tự câu; bấm một mảnh đã xếp để bỏ ra, hoặc Xếp lại từ đầu. Câu ghép đôi: các mục để ghép có chữ cái A, B, C…; với mỗi mục bên trái, chọn chữ cái của mục hợp với nó (chọn một mục đã dùng ở dòng khác thì nó chuyển sang dòng này). Câu đọc hiểu có đoạn văn ngay trên đề; các câu cùng đoạn văn nằm liền nhau.",
      "Bài luyện tập có nút Kiểm tra câu này; gõ xong bấm Enter để kiểm tra, bấm Enter lần nữa để sang câu sau. Trên điện thoại, sau khi kiểm tra có nút Câu sau ngay dưới câu. Bài nhiều câu hiện từng câu, có Câu trước và Câu sau; trên máy tính bấm Cả bài để xem mọi câu một lượt (máy nhớ lựa chọn). Bài dài có Danh sách câu (✓ đúng, ✗ chưa đúng) để nhảy tới câu bất kỳ; thanh Nộp bài ở cuối màn hình luôn cho biết đã trả lời bao nhiêu câu. Khi nộp mà còn câu trống, bấm Đến câu chưa làm. Trả lời đúng hay sai có tiếng báo ngắn; bấm nút loa để tắt.",
      "Bấm Nộp bài để xem điểm và giải thích. Bài luyện tập có câu sai sẽ mở sẵn các câu sai; bấm Tất cả hoặc Đúng để xem câu khác. Còn lượt thì bấm Làm lại lượt mới; điểm của lượt mới sẽ thay điểm cũ. Mở lại bài đã nộp thì nút chính là Xem kết quả.",
      "Bài có hạn và không cho nộp muộn: trong giờ cuối có đồng hồ đếm ngược và bài tự nộp khi còn 1 phút. Nếu bạn đã đóng trang trước đó, Reng tự nộp các câu đã lưu vào khoảng 6 giờ sáng sau hạn. Lượt làm lại khi đã có lượt nộp trước thì không bị nộp, để giữ điểm cũ.",
      "Lớp có luyện tập hằng ngày: bấm Điểm luyện tập hằng ngày ở đầu trang lớp để xem điểm từng ngày, bấm một ngày để xem lại từng câu.",
      "Mỗi ngày có thể có bài Luyện tập hằng ngày, hạn 23:59 cùng ngày; nộp muộn vẫn được, tối đa 3 lượt. Ngày bỏ lỡ được gom vào dòng Luyện tập hằng ngày đã lỡ ở Lớp của tôi; bấm Xem các ngày để làm bù.",
    ],
  },
  {
    id: "learner-jlpt",
    title: "Thi thử JLPT",
    steps: [
      "Đề thi thử ghi Thi thử JLPT N5 (hoặc N4) và số phút làm bài. Trang đề cho biết còn bao nhiêu ngày tới kỳ thi JLPT tiếp theo.",
      "Đồng hồ bắt đầu khi bạn bấm Bắt đầu thi và vẫn chạy khi đóng trang hay mất mạng; nếu bắt đầu sát hạn thì lượt kết thúc ở hạn. Đề chỉ có một lượt, nên làm ở nơi yên tĩnh và có tai nghe cho phần nghe. Mỗi câu nghe chỉ phát một lần, không dừng, tua hay nghe chậm, nên đọc câu hỏi và các lựa chọn trước khi bấm Nghe.",
      "Dưới đồng hồ có giờ gợi ý cho từng phần như đề thật (N4: chữ Hán – từ vựng 25 phút, ngữ pháp – đọc hiểu 55 phút, nghe hiểu 35 phút; N5: 20, 40, 30 phút). Hết giờ gợi ý của một phần, bấm Đến câu … để sang phần sau; đây chỉ là gợi ý, đồng hồ chung mới quyết định lúc nộp.",
      "Hết giờ, trang tự nộp. Nếu bạn đã đóng trang, Reng nộp các câu đã lưu khi bạn mở lại đề hoặc vào khoảng 6 giờ sáng hôm sau.",
      "Trang kết quả có số câu đúng từng phần và điểm ước tính trên thang 180: đỗ cần tổng từ 80 (N5) hoặc 90 (N4), phần ngôn ngữ và đọc hiểu từ 38/120, nghe hiểu từ 19/60.",
      "Tiến độ của tôi có bảng Thi thử JLPT gom mọi đề đã công bố điểm, mới nhất ở trên, kèm điểm tăng giảm so với lần trước cùng cấp, để bạn thấy mình còn cách mức đỗ bao xa.",
    ],
  },
  {
    id: "learner-account",
    title: "Tài khoản",
    steps: [
      "Bấm Tài khoản trên thanh đầu trang (hoặc cuối trang Lớp của tôi) để đổi họ tên hiển thị hoặc đặt mật khẩu mới. Đổi mật khẩu sẽ đăng xuất các thiết bị khác.",
      "Nhắc học: ở tab Nhắc học của trang Tài khoản, bấm Bật thông báo trên thiết bị này và cho phép thông báo. Reng nhắc lúc 20:00 khi bạn có bài cần làm hoặc thẻ cần ôn; bấm Gửi thử để kiểm tra. Mỗi máy, mỗi trình duyệt bật riêng; đăng xuất sẽ tắt thông báo trên máy đó. Trên iPhone, iPad: mở Reng bằng Safari, bấm Chia sẻ rồi Thêm vào MH chính, mở Reng từ biểu tượng mới rồi mới bật được.",
      "Muốn ngừng dùng Reng, kéo xuống mục Xóa tài khoản và gõ XÓA để xác nhận. Họ tên, email và cách đăng nhập bị xóa, bạn rời mọi lớp; bài đã nộp vẫn ở lại trong thống kê của lớp dưới tên Học viên đã xóa. Không khôi phục được.",
    ],
  },
  {
    id: "learner-review",
    title: "Ôn tập và tiến độ",
    steps: [
      "Ôn tập đưa ra từ vựng và câu đã sai khi tới lịch ôn. Sổ lỗi gom câu sai theo từng bài giao, lọc được câu Đến hạn ôn; câu đúng 3 lần liên tiếp khi ôn được đánh dấu đã giải quyết. Tiến độ của tôi cho thấy chuỗi ngày học với các mốc và lịch 12 tuần, bài đã đọc, kết quả bài tập, tỉ lệ đúng theo dạng câu và thẻ ôn tập. Ba nút này nằm ở mục Ôn lại và tiến độ trong Lớp của tôi và ở mục Đi nhanh tới trên trang chủ.",
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
    question: "Mở link lớp hoặc bài tập thì báo trang chưa có?",
    answer:
      "Link lớp, bài học và bài tập chỉ mở được bằng tài khoản có quyền. Kiểm tra bạn đang đăng nhập đúng tài khoản đã vào lớp ở mục Tài khoản; nếu khác, đăng xuất rồi đăng nhập lại bằng tài khoản đó.",
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
        ngay cạnh nút đó. Mục <Link href="/self-study">Tự học</Link> có bài học công khai và công cụ
        luyện tập của từng môn, không cần tài khoản. Ba nút Giao diện ở góc phải thanh đầu trang
        (màn hình, mặt trời, mặt trăng) đổi nền theo máy, sáng hoặc tối; slide luôn giữ nền sáng.
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
          </ul>
        </div>
        <div>
          <h2>Chung</h2>
          <ul>
            <li>
              <a href="#admin-title">Dành cho quản trị viên</a>
            </li>
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
          Tài khoản quản trị thấy mục Quản trị trên thanh đầu trang: bật hoặc tắt Duyệt giáo viên
          mới trước khi cho dạy; duyệt, tạm dừng hoặc từ chối giáo viên; ghi hạn thuê và xem nhật ký
          thao tác. Hết hạn thuê không tự khóa giáo viên: trang Quản trị đếm số giáo viên quá hạn để
          bạn xử lý. Quyền quản trị do người vận hành cấp trong database, không đăng ký được trên
          trang.
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
