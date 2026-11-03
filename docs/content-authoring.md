# Biên soạn và xuất bản nội dung

## Nguồn và duyệt bài

Từ giai đoạn 4, giảng viên soạn và xuất bản bài trên web tại /teach/lessons/new và /teach/lessons/[id]/edit, nhập từ vựng hàng loạt tại /teach/import-csv (CSV UTF-8 hoặc dán bảng Excel). Script bên dưới vẫn dùng cho bài mẫu trong repo và kiểm tra hàng loạt.

Draft nằm ở content/lessons/*.json. Năm bài hiện tại là mẫu tự biên soạn, không nhập từ giáo trình hoặc từ điển bên ngoài. Giữ isSample=true cho đến khi giảng viên duyệt câu Nhật, nghĩa Việt, cách đọc, đáp án và audio. Không đánh dấu đã duyệt chỉ vì validator chạy qua.

ID bài/item dùng tiếng Anh hoặc mã ổn định, không tái dùng ID cũ cho ý nghĩa khác. Slide chỉ refs/ref tới từ vựng/ngữ pháp/câu luyện. TeacherNotes là ghi chú riêng; note.body là nội dung công khai. Không đặt đáp án kiểm tra cần bảo mật vào questions của bài công khai.

## Bài tiếng Nhật theo trình tự Minna no Nihongo (pilot)

**Trạng thái 29/10/2026:** pilot ưu tiên dạy tiếng Nhật cho người Việt theo trình tự bài của Minna no Nihongo Sơ cấp. Tại `/teach/lessons/new`, nút **Tạo bài 11 từ mẫu** tạo một bản nháp riêng của giáo viên từ `content/starters/minna-1-11.json`: 54 từ vựng, 5 mẫu câu, 38 slide (từ vựng, bảng đếm, mẫu câu, ví dụ, luyện thay thế, câu hỏi, hội thoại, tóm tắt) và 50 câu luyện choice/fill hiragana (đọc lượng từ và kanji, nghĩa từ, ngữ pháp) đủ cho bài luyện hằng ngày đổi câu khoảng một tuần. Bấm lại trên cùng trang không tạo bản thứ hai.

Từ 30/10/2026 có thêm bài mẫu **bài 1** (`minna-1-01`: giới thiệu bản thân, は／です, じゃ ありません, か, も, の; 45 từ, 36 slide, 50 câu) và **bài 2** (`minna-1-02`: これ・それ・あれ, この・その・あの, そうです, câu hỏi lựa chọn, なんの／だれの; 44 từ, 36 slide, 50 câu), soạn theo cùng nguyên tắc: nhân vật cố định của Reng (ナム, アン, リン, ハナ, 田中, 先生), tên trường/ngân hàng/bệnh viện tự đặt (みどり大学, あおば銀行, ひかり病院), không dùng nhân vật, hội thoại hay tên riêng của sách. Bài 3–10 sẽ soạn tiếp theo từng lô sau khi giáo viên duyệt.

Cũng từ 30/10/2026 có thêm nút **Tạo bài 12 từ mẫu** (`content/starters/minna-1-12.json`), cũng tự biên soạn theo chủ điểm bài 12: 51 từ vựng (tính từ trái nghĩa, mùa và thời tiết, món ăn Nhật, どちら・いちばん・ずっと, ただいま／おかえりなさい), 5 mẫu câu (quá khứ của danh từ và tính từ đuôi な; quá khứ tính từ đuôi い kể cả いい → よかった; so sánh より; どちら／〜の ほうが／どちらも; 〜の なかで いちばん), 41 slide gồm bảng chia quá khứ, 4 bảng luyện tập, 2 slide hình cho luyện so sánh (より／どちら và いちばん), 4 hội thoại bối cảnh Việt Nam (Đà Lạt, mùa yêu thích, nhà hàng, về nhà) và 50 câu luyện choice/fill hiragana. Mỗi slide hội thoại tối đa 6 lượt để vừa khung trình chiếu. 12 câu đọc kanji trong bài đã gắn thẻ `kanji` nên nút **Tạo câu kanji** chỉ bổ sung cho 29 từ còn lại (58 câu).

Từ 02/11/2026 có **Tạo bài 13 từ mẫu** (`content/starters/minna-1-13.json`): 46 từ vựng, 5 mục ngữ pháp (Nが ほしいです; V bỏ ます + たいです; phủ định/quá khứ của たい; nơi đến へ + mục đích に + 行きます・来ます・帰ります; 何か・どこか), 41 slide và 50 câu luyện (30 trắc nghiệm, 20 điền hiragana, gồm 10 câu đọc kanji có thẻ riêng). Slide có 5 bảng luyện và 4 hội thoại tự biên soạn với nhân vật Reng: quà sinh nhật, hẹn cuối tuần, đói/khát, gọi món/tính tiền riêng. Ví dụ có furigana, ghi chú giải thích を／が với たい và cách mời lịch sự. Mẫu không tự xuất bản hoặc giao lớp; giáo viên tạo nháp, duyệt rồi xuất bản/giao phiên bản như các bài trước.

Từ 03/11/2026 có **Tạo bài 3 từ mẫu** (`content/starters/minna-1-03.json`), tự biên soạn theo chủ điểm bài 3: 52 từ vựng (ここ・そこ・あそこ・どこ và こちら・そちら・あちら・どちら, phòng trong trường và tòa nhà, cửa hàng bách hóa, tầng 〜かい, giá tiền 〜えん/ドン, số ひゃく・せん・まん, いらっしゃいませ, 〜を みせて ください, 〜を ください), 5 mẫu câu (ここ／そこ／あそこ は N です; N は どこですか; cách nói lịch sự こちら…どちら và お国は どちらですか; どこの N; いくらですか và 〜を ください), 39 slide gồm bảng ここ/こちら/これ, bảng đọc số có biến âm (さんびゃく, ろっぴゃく, はっせん…), bảng tầng, 4 bảng luyện thay thế và 3 hội thoại (hỏi phòng họp ở quầy lễ tân, hỏi quê, mua đồng hồ), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana). Ngữ cảnh cho người Việt: giá phở bằng ドン, quê ở Hà Nội, ダナン, フエ.

Cùng ngày có **Tạo bài 4 từ mẫu** (`content/starters/minna-1-04.json`), tự biên soạn theo chủ điểm bài 4: 48 từ vựng (động từ sinh hoạt おきます・ねます・はたらきます・やすみます・べんきょうします・はじまります・おわります, giờ và phút, ごぜん／ごご, buổi trong ngày, きのう・きょう・あした, 毎朝・毎晩・毎日, thứ trong tuần, bưu điện, thư viện, bảo tàng, số điện thoại), 5 mẫu câu (いま 〜じ〜ふんです; V ます／ません; V ました／ませんでした; 〜じに V; N1 から N2 まで và N1 と N2), 38 slide gồm bảng đọc giờ, bảng đọc phút (ふん／ぷん), bảng bốn dạng động từ, 4 bảng luyện và 3 hội thoại (gọi điện hỏi giờ mở cửa thư viện, hỏi giờ dậy, giáo viên hỏi việc học hôm qua), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana). Có câu đổi giờ Hà Nội sang giờ Tokyo (chênh 2 giờ).

Cùng ngày có **Tạo bài 5 từ mẫu** (`content/starters/minna-1-05.json`), tự biên soạn theo chủ điểm bài 5: 47 từ vựng (いきます・きます・かえります, nơi chốn, phương tiện gồm バイク, người đi cùng, ひとりで, どこも, tuần・tháng・năm trước/này/sau, tháng và ngày, いつ, sinh nhật, どういたしまして, trợ từ へ・で・と, ホーチミン, ダナン), 5 mẫu câu (N へ 行きます／来ます／帰ります; どこ（へ）も 行きません; phương tiện で và あるいて; người と và ひとりで; いつ và 〜月〜日), 38 slide gồm bảng tuần・tháng・năm, bảng tháng, bảng 12 ngày đọc riêng, 4 bảng luyện và 3 hội thoại (chủ nhật đi đâu, khi nào về nước, sinh nhật), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana).

Cùng ngày có **Tạo bài 6 từ mẫu** (`content/starters/minna-1-06.json`), tự biên soạn theo chủ điểm bài 6: 48 từ vựng (động từ たべます・のみます・すいます・みます・ききます・よみます・かきます・かいます・とります・します・あいます, bữa ăn, đồ ăn thức uống gồm フォー, thư, báo cáo, ảnh, bài tập, thể thao, お花見, cửa hàng, công viên, なに・なにも, いっしょに, ちょっと, いつも・ときどき, それから, ええ, いいですね, わかりました), 5 mẫu câu (N を V ます; なにも V ません; nơi chốn で V ます; いっしょに V ませんか; V ましょう), 37 slide gồm bảng động từ đi với を, bảng đồng ý và từ chối nhẹ, 3 bảng luyện, 1 bảng hỏi đáp và 3 hội thoại (rủ ăn trưa, chủ nhật làm gì, hẹn đi ngắm hoa), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana).

Cùng ngày có **Tạo bài 7 từ mẫu** (`content/starters/minna-1-07.json`), tự biên soạn theo chủ điểm bài 7: 48 từ vựng (きります, おくります, あげます・もらいます, かします・かります, おしえます・ならいます, でんわを かけます, đồ dùng はし・スプーン・ナイフ・フォーク・はさみ・パソコン・ケータイ・ペン, quà tặng và đồ đạc, ちち・はは／おとうさん・おかあさん, もう・まだ・これから, câu nói khi đến nhà và khi ăn), 5 mẫu câu (công cụ で; 「…」は 〜ごで なんですか; người nhận に + あげます…; người cho に + もらいます…; もう V ました／まだです), 36 slide gồm bảng cho và nhận, bảng câu nói theo tình huống, 3 bảng luyện, 1 bảng hỏi đáp và 3 hội thoại (khen chiếc áo được tặng, đến nhà anh Tanaka, đã gửi báo cáo chưa), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana).

Cùng ngày có **Tạo bài 8 từ mẫu** (`content/starters/minna-1-08.json`), tự biên soạn theo chủ điểm bài 8: 50 từ vựng (9 tính từ đuôi な, 17 tính từ đuôi い gồm các cặp trái nghĩa, 4 màu, さくら・やま・ふじさん・まち・たべもの・ところ・りょう・せいかつ, どう・どんな, とても・あまり, そして, 〜が, câu nói khi được mời thêm và khi xin phép về, ホイアン), 5 mẫu câu (N は adj です; phủ định じゃ ありません／〜くないです và いい → よくないです; tính từ trước danh từ; どう／どんな N; とても・あまり 〜ない・〜が・そして), 36 slide gồm bảng hai loại tính từ, 4 bảng luyện và 3 hội thoại (cuộc sống ở Nhật, Hội An là thành phố thế nào, xin phép về), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana).

Cùng ngày có **Tạo bài 9 từ mẫu** (`content/starters/minna-1-09.json`), tự biên soạn theo chủ điểm bài 9: 48 từ vựng (わかります, あります, すき・きらい・じょうず・へた, sở thích: món ăn, đồ uống, thể thao, du lịch, âm nhạc, karaoke, mua sắm, tranh; các loại chữ; いぬ・ねこ; tiền lẻ, vé, thời gian, việc bận, cuộc hẹn, việc làm thêm; vợ chồng mình và của người khác; よく・だいたい・たくさん・すこし・ぜんぜん; どうして, 〜から; câu từ chối khéo), 5 mẫu câu (N が あります／わかります; N が すき・きらい・じょうず・へたです; どんな N が すきですか; mức độ よく…ぜんぜん; 〜から và どうして), 35 slide gồm bảng mức độ hiểu, 3 bảng luyện, 1 bảng hỏi đáp và 3 hội thoại (món ăn yêu thích, được khen giỏi tiếng Nhật, từ chối lời mời đi karaoke), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana).

Cùng ngày có **Tạo bài 10 từ mẫu** (`content/starters/minna-1-10.json`), tự biên soạn theo chủ điểm bài 10: 48 từ vựng (います・あります, người và con vật, đồ đạc trong nhà, nơi chốn quanh khu phố, hồ và sông, 11 từ chỉ vị trí, いろいろ, 〜や〜など, いちばん, おく, コーナー, ヌクマム, しょうゆ, あのう, どうも すみません), 5 mẫu câu (N が あります／います; N1 に N2 が あります; N2 は N1 に あります; N の うえ／した… và N1 と N2 の あいだ; N1 や N2 など), 37 slide gồm bảng あります hay います, bảng từ chỉ vị trí, 3 bảng luyện, 1 bảng hỏi đáp và 3 hội thoại (tìm nước mắm ở siêu thị, gần đây có ngân hàng không, con mèo ở đâu), 50 câu luyện (36 trắc nghiệm, đáp án chia đều 4 vị trí; 14 điền hiragana). Từ ngày này giáo viên có bài mẫu liên tục từ bài 1 đến bài 13.

Nội dung do Reng tự biên soạn theo chủ điểm bài 11 (đếm 〜つ・〜人・〜台・〜枚・〜回, khoảng thời gian, tần suất, だけ); câu ví dụ, hội thoại và bài luyện là bản viết mới, không chép nguyên văn sách, tranh hay đĩa nghe. Giáo viên duyệt và sửa trước khi xuất bản; học viên dùng sách có bản quyền của mình để đối chiếu. Bài tiếp theo: dùng **Tạo bản sao** từ bài 11 rồi sửa, hoặc soạn mới trong editor. Thêm bài mẫu mới = thêm JSON vào `content/starters/` và đăng ký trong `lib/starter-lessons.ts`; test yêu cầu bài mẫu xuất bản được ngay và đáp án trắc nghiệm không nằm cùng một vị trí (lựa chọn hiển thị đúng thứ tự soạn).

Slide bài Nhật có thêm hai loại: **Hội thoại** (`dialogue`: tiêu đề, tối đa 8 lượt người nói/câu Nhật/nghĩa Việt, mặc định ẩn nghĩa và hiện từng lượt) và **Bảng / luyện thay thế** (`table`: tối đa 6 cột × 12 hàng, dán từ Excel/Google Sheets hoặc gõ các ô cách nhau bằng `|`; bật luyện thay thế để ẩn cột cuối và hiện câu mẫu từng hàng). Trang đọc của học viên hiện hội thoại và bảng; câu mẫu của bảng luyện được gấp trong "Xem câu mẫu".

Hình minh họa (30/10/2026): mỗi từ vựng có ô **Hình** để chọn icon (danh mục nhãn tiếng Việt); chỉ gắn cho từ cụ thể. Slide tiêu đề có ô **Hình mở đầu** cho tranh của bài. Bài mẫu 1, 2, 11 và 12 đã gắn sẵn icon; bài 12 còn có hình mở đầu bốn mùa và hai slide hình ghép từ icon ([hình minh họa](illustrations.md)). Bản bài đã tạo từ mẫu trước đó không tự cập nhật. Từ 02/11/2026, bấm **Cập nhật từ mẫu** (trang Giảng dạy hoặc đầu editor, chỉ có ở bài tạo từ mẫu): trang `/teach/lessons/[id]/starter` so sánh số slide, câu hỏi và hình của bản nháp với mẫu mới nhất. Sau khi xác nhận, nội dung nháp được thay bằng mẫu, còn tên, thứ tự và khóa học giữ nguyên. Chỉnh sửa riêng trong nháp sẽ mất; phiên bản đã xuất bản, lớp và bài đã giao không đổi cho tới khi giáo viên xuất bản lại và chọn phiên bản mới cho lớp. Muốn giữ chỉnh sửa riêng thì chọn hình trong trình soạn thay vì cập nhật. Hướng dẫn tạo ảnh nhân vật và tranh mở đầu bằng AI: [hình minh họa](illustrations.md).

Furigana viết `{漢字|かんじ}` trong dòng tiêu đề Nhật, mẫu câu, giải thích, ví dụ, hội thoại, bảng và ghi chú; nút Nghe/audio đọc phần furigana và bỏ ký hiệu 〜. Đề câu luyện hiển thị văn bản thường nên viết kana. Số trong câu Nhật dùng 0–9 (số toàn góc nhiều chữ số bị giãn). Ô điền hiragana hoàn tất romaji còn dở khi rời ô (`yonin` → よにん); ん giữa từ vẫn gõ `nn` (さんにん: `sannnin`).

**Luyện kanji (30/10/2026):** cột kanji của từ vựng là nguồn luyện chữ Hán. Học viên mở "Luyện kanji" ở trang đọc bài hoặc trang lớp để luyện đọc chữ, nhận mặt chữ và hiểu nghĩa; cách đọc đúng là cột kana giáo viên ghi. Trong trình soạn, mục Câu luyện có nút **Tạo câu kanji cho N từ**: mỗi từ có chữ Hán được thêm một câu điền cách đọc (Hiragana) và một câu chọn mặt chữ, gắn thẻ `kanji`; xem lại, sửa hoặc xóa rồi lưu nháp và xuất bản. Câu này dùng như câu luyện thường khi giao bài và trong bài luyện hằng ngày. Giữ cột kana đúng cách đọc trong bài (ví dụ `〜人` ghi `〜にん`) vì đó là đáp án duy nhất được chấp nhận. Thiết kế: [luyện kanji](basic-design/kanji-practice.md).

## Kiểm tra và xuất bản local

```bash
npm run lesson:import -- --file content/lessons/lesson-01.json
npm run lesson:import -- --file content/lessons/lesson-01.json --publish local --revision 1
```

Lệnh đầu chỉ validate. Lệnh thứ hai tạo version 2 nếu version hiện tại là 1; revision sai bị từ chối. Local catalog giữ toàn bộ version cũ; đổi draft không làm thay đổi trang đang đọc. URL có version ID giữ được snapshot cũ. Trước xuất bản, xem nội dung dài nhất ở chế độ đọc và slide.

## Audio cho bài học

```bash
npm run audio:plan -- --lessons
npm run audio:generate -- --lessons --local
```

Plan chỉ liệt kê công việc. Generate cần khóa Azure; output ở public/audio/lessons, mapping ở content/lesson-audio-manifest.json. Script cập nhật hash trong draft, kiểm tra draft chưa bị sửa trong khi chạy. Sau khi nghe duyệt, xuất bản version mới; không sửa catalog cũ để chèn audio. Kana vẫn dùng manifest và thư mục audio/kana riêng.

Với R2, dùng --lessons --r2 và R2_LESSON_PUBLIC_BASE_URL; đặt NEXT_PUBLIC_LESSON_AUDIO_BASE_URL cùng base cho web. Thêm --sync-db khi muốn đăng ký metadata trong Supabase. Không đặt secret vào biến NEXT_PUBLIC_ hoặc tên file audio.

Bài soạn trên web nằm trong database, không có file JSON. Sinh audio cho nháp đó (từ vựng, câu ví dụ, transcript câu nghe):

```bash
npm run audio:plan -- --lessons --db --lesson lesson-id
npm run audio:generate -- --lessons --db --sync-db --r2 --lesson lesson-id
```

Bỏ --lesson để xử lý mọi bài chưa lưu trữ. Script ghi hash vào nháp chỉ khi revision chưa đổi trong lúc chạy, rồi giảng viên tải lại editor, nghe thử và xuất bản. Câu nghe không xuất bản được khi chưa có audio. Với Supabase local có thể dùng --local thay --r2; database cloud bắt buộc --r2 để metadata có URL công khai.

## Xuất bản Supabase

Chỉ thực hiện khi đã chỉ định staging, áp dụng migration và chuẩn bị owner teacher. Draft phải isSample=false, đủ audio và các hash đã được đăng ký trong audio_assets.

```bash
npm run lesson:import -- --file path/to/reviewed-lesson.json --publish supabase --revision 0 --owner teacher-user-uuid
```

RPC dùng transaction cho draft/version/pointer, từ chối sai owner/revision. Script không tạo tài khoản, apply migration hoặc deploy. Với Supabase local, `npm run seed:local` xuất bản 5 bài mẫu cho giảng viên mẫu và giữ is_sample=true; script từ chối URL không phải máy local. Đặt LESSON_SOURCE=supabase để web đọc nguồn thật; lỗi cloud hiển thị lỗi, không âm thầm thay bằng bài mẫu.

## Chia sẻ (đã có) và nhập scan (chưa triển khai)

Chia sẻ phiên bản view/copy, thu hồi, sao chép và tạo bản sao bài của mình đã có bản local; bản sao không chia sẻ tiếp được. Chi tiết ở [DD dịch vụ](detail-design/teaching-service.md).

Bài Nhật mẫu/CLI/editor hiện tại giữ nguyên. Dịch vụ mới thêm ngôn ngữ, nguồn/quyền dùng, chia sẻ version view/copy và ảnh/PDF làm nguồn nhập. Bản copy phải có chủ mới, nguồn và quyền media; không mang theo notes hoặc câu test riêng. Không cho chia sẻ lại nếu quyền nguồn không cho phép.

Scan đi qua upload riêng tư → nhận dạng/gợi ý → giáo viên sửa/duyệt → draft chuẩn → xuất bản → giao bài. Cho nhập tay khi nhận dạng kém. Chỉ thêm ảnh vào slide không tạo câu tự chấm. Giáo viên xác nhận quyền dùng scan và đáp án; không đưa ảnh nguyên trang có lời giải tới học sinh. Nhật/Trung phải được duyệt bởi người đủ chuyên môn. Chi tiết theo [BD dịch vụ](basic-design/teaching-service.md).

## Soạn bài theo mẫu

**Trạng thái 29/10/2026:** đã có bản local tại `/teach/lessons/new` (chọn mẫu) và wizard 5 bước ở `/teach/lessons/[id]/edit`: mục tiêu/thông tin, bảng từ (nhập từng dòng hoặc dán Excel, xem trước lỗi từng dòng), mẫu câu và hội thoại, câu luyện (tạo khung chọn nghĩa/viết chữ Hán/viết pinyin từ từ vựng, giáo viên xác nhận đáp án), dựng slide có xem trước thay đổi, xem trước trang học viên và xuất bản. Chưa có: TTS trên web và nghe duyệt audio (nút Nghe dùng giọng Trung của thiết bị nếu có, không dùng giọng Nhật), phần "ôn bài cũ" tự lấy từ bài trước, luyện theo vai riêng và đo thời gian với giáo viên thật. Dùng lại/sao chép bài đã có theo quyền chia sẻ, xem mục Chia sẻ bên trên.


Giáo viên là người soạn và chịu trách nhiệm chuyên môn. Reng cung cấp mẫu bố cục, công cụ nhập và bộ bài minh họa nhỏ do giáo viên tiếng Trung biên soạn/duyệt; không yêu cầu đội vận hành viết toàn bộ giáo trình. Giáo viên có thể dùng mẫu trống, dùng lại bài của mình hoặc sao chép bài đồng nghiệp khi được cấp quyền.

Luồng mặc định: **Chọn mẫu → Nhập nội dung → Dựng slide → Thêm bài tập → Xem trước và giao lớp**. Luôn có đường nhập tay; không cần có tài liệu scan, không cần AI/OCR hoặc tài khoản cloud mới soạn được nội dung cơ bản. Các thao tác lưu/xuất bản/giao lớp vẫn cần backend tài khoản như hiện tại.

### Bước 1 — Chọn mẫu và mục tiêu nhỏ

| Mẫu | Giáo viên cần chuẩn bị | Khung bài được tạo |
|---|---|---|
| Buổi đầu làm quen | Một mục tiêu, vài từ/câu quen thuộc | Mục tiêu → nội dung mới → mẫu hội thoại → luyện tập → việc về nhà |
| Dạy từ mới | Bảng từ và ví dụ | Mục tiêu → ôn bài cũ (tùy chọn) → từ mới → ví dụ → luyện tập → việc về nhà |
| Luyện hội thoại | Tình huống và lượt lời | Mục tiêu → từ/câu cần dùng → hội thoại → luyện theo vai → việc về nhà |
| Ôn tập | Chọn bài/từ/câu đã dạy | Mục tiêu → ôn kiến thức → ví dụ → câu luyện → việc về nhà |

Đề xuất ban đầu 3–5 từ/cụm từ, một mẫu câu và 3–5 câu luyện cho một bài nhập môn nhỏ; giáo viên điều chỉnh, không dùng số lượng này làm giới hạn cứng hay chuẩn sư phạm. Bài đầu không bắt buộc có phần ôn bài cũ. Mẫu chỉ cung cấp cấu trúc; phần nội dung mẫu phải ghi rõ minh họa/chưa duyệt nếu chưa được giáo viên duyệt.

### Bước 2 — Nhập nội dung quen thuộc

Giao diện Việt–Trung dùng cột **Chữ Hán | Pinyin | Nghĩa Việt | Ví dụ (tùy chọn)**. Giáo viên thêm từng dòng hoặc dán bảng Excel/Google Sheets, xem trước và sửa lỗi theo ô/dòng. Các trường bổ sung như pinyin/nghĩa ví dụ và ghi chú riêng nằm trong phần mở rộng. Không bắt nhập JSON, mã slide, tên asset hoặc chọn loại slide ngay từ đầu; mã nội bộ do hệ thống tạo.

Cho lưu nháp khi chưa đủ nội dung. Khi xuất bản, kiểm tra trường bắt buộc theo loại nội dung; ví dụ không có pinyin chỉ là cảnh báo nếu giáo viên chủ động bỏ, không tự sinh rồi coi là đúng. Giữ dấu thanh và giản/phồn theo bài. Audio có trạng thái chưa có/đang tạo/cần nghe duyệt/sẵn sàng; giáo viên không phải chạy CLI. TTS trên web là phần cần làm thêm, không phải khả năng hiện có của editor.

### Bước 3 — Dựng và chỉnh slide

Bấm **Dựng slide từ nội dung**, hệ thống áp dụng bố cục có sẵn, chia nội dung dài thành nhiều slide để đọc rõ. Giáo viên xem trước rồi thêm/bớt/đổi thứ tự; trình soạn chi tiết hiện tại là lựa chọn bổ sung. Nội dung bảng và slide dùng chung tham chiếu, sửa từ không phải sửa lại thủ công mọi slide.

Dựng lại chỉ cập nhật phần do hệ thống tạo sau khi xem danh sách thay đổi. Không tự xóa slide/ghi chú đã sửa tay. Có hủy thao tác khi còn ở bản nháp chưa lưu; khi tải lại lấy bản đã được server xác nhận. Thay mẫu phải cho xem trước và xác nhận thay đổi, không làm mất bài đang soạn.

### Bước 4 — Tạo bài tập có kiểm tra

Giáo viên chọn từ/câu vừa nhập và dạng **Trắc nghiệm** hoặc **Điền từ**, hoặc tự thêm câu **Sắp xếp** và câu có đoạn văn đọc hiểu (xem [mục bên dưới](#câu-sắp-xếp-và-đọc-hiểu-trên-trình-soạn)). Hệ thống điền khung câu hỏi, giáo viên bổ sung lựa chọn, đáp án chấp nhận, điểm và giải thích. Không tự coi tất cả từ còn lại là đáp án nhiễu hợp lệ; các lựa chọn phải được kiểm tra để tránh nhiều đáp án đúng ngoài ý muốn. Nếu chưa đủ dữ liệu thì báo phần cần nhập, không bịa đáp án.

Giáo viên xác nhận từng câu sau khi sửa cuối cùng trước khi dùng trong bài xuất bản. Câu luyện hiện trên slide không được dùng làm câu test bí mật. Giáo viên chọn câu luyện cho bài về nhà practice; test dùng luồng câu riêng và chính sách phản hồi hiện tại. Scan chỉ là một nguồn bổ sung để tạo draft ở bước nhập nội dung/bài tập, vẫn đi qua kiểm tra này.

### Bước 5 — Xem trước, xuất bản và giao lớp

**Lưu nháp** giữ bài đang làm; **Xuất bản** tạo version để dùng dạy; **Giao cho lớp** chọn lớp, version, thời điểm mở, hạn và loại practice/test. Xem trước cả slide lẫn màn hình học sinh; lỗi dẫn về đúng dòng/câu. Lớp và hạn nộp không được tự suy ra từ bài mẫu. Xuất bản không tự mở bài cho mọi lớp hoặc tự gửi email; học liệu mặc định riêng cho lớp được cấp quyền, công khai/chia sẻ là lựa chọn riêng có xác nhận.

Không bắt buộc giao bài nếu giáo viên chỉ muốn trình chiếu. Sửa draft sau xuất bản không đổi bài đang dạy hoặc bài đã giao. Hiển thị “Đã lưu” khi server xác nhận, báo còn thay đổi chưa lưu và xung đột hai tab; không dùng trạng thái xem trước để báo đã xuất bản/giao thành công.

### Dạy từ dễ đến khó và thử nghiệm thực tế

Mỗi bài có mục tiêu làm được gì, đối tượng, kiến thức cần biết trước và thứ tự gợi ý trong khóa. Lộ trình nhập môn minh họa: làm quen âm/thanh điệu cơ bản → chào hỏi → nói tên → hỏi/đáp ngắn → ôn tập. Đây là khung để giáo viên chuyên môn điều chỉnh, không phải giáo trình tiếng Trung đã được thẩm định. Không tự khóa học sinh vì chưa học bài trước trừ khi có thiết kế điều kiện học riêng sau này.

Ví dụ mục tiêu bài nhỏ: “Học sinh chào hỏi và nói tên mình”. Giáo viên chọn vài từ/cụm từ, một mẫu tự giới thiệu, hội thoại ngắn và vài câu luyện; không nhồi toàn bộ kiến thức phát âm vào một buổi. Reng gợi ý thứ tự, giáo viên quyết định độ khó và thời lượng theo lớp.

Thử với một giáo viên tiếng Trung chưa được hướng dẫn editor, một bài nhập môn và một lớp thật trước khi làm nhiều mẫu. Mục tiêu thử nghiệm: từ chọn mẫu đến bản sẵn sàng dạy dưới 30 phút với nội dung giáo viên đã chuẩn bị; đo riêng thời gian chuẩn bị chuyên môn, nhập/sửa/xem trước và các chỗ cần người hỗ trợ. Đây là mục tiêu cần đo, chưa phải kết quả. Ưu tiên mẫu + bảng + dựng slide + practice trước OCR.

## Câu sắp xếp và đọc hiểu trên trình soạn

Từ 03/11/2026 hai dạng này soạn được ngay trên trình soạn tiếng Nhật, trình soạn tiếng Trung và ở câu kiểm tra riêng khi giao bài, không cần sửa JSON.

- **Sắp xếp câu:** bấm **Thêm câu sắp xếp**, ghi các mảnh theo đúng thứ tự câu, mỗi dòng một mảnh. Dòng "Câu đúng" bên dưới cho xem câu ghép lại (tiếng Nhật và tiếng Trung ghép liền, chữ Latin cách nhau một khoảng trắng). Học viên nhận các mảnh đã xáo và bấm theo thứ tự.
  - Từ 2 đến 10 mảnh, mỗi mảnh tối đa 60 ký tự.
  - Không để hai mảnh giống nhau, vì học viên không phân biệt được. Gộp mảnh trùng vào mảnh bên cạnh, ví dụ `わたしの` thay vì `わたし` và `の`.
  - Chỉ có một thứ tự đúng với nghĩa ghi trong đề. Tránh hai cụm đổi chỗ cho nhau mà câu vẫn đúng.
- **Đọc hiểu:** bấm **Thêm đoạn văn đọc hiểu** (trình soạn tiếng Trung: **Thêm đoạn văn cho câu N**), dán đoạn văn, rồi ghi đề chỉ là câu hỏi. Bấm **Thêm câu hỏi cho đoạn văn này** để thêm câu trắc nghiệm mới ngay sau, dùng đúng đoạn văn đó. Các câu cùng đoạn văn được giao liền nhau trong bài hằng ngày. Đoạn văn tối đa 2.000 ký tự; xóa hết chữ để bỏ đoạn văn.
- Câu sắp xếp hiện được trên slide câu luyện của bài tiếng Trung: slide hiện đoạn văn và các mảnh đã xáo, nút "Hiện đáp án" cho câu đúng. Slide của bài tiếng Nhật vẫn chỉ chọn câu trắc nghiệm và điền.
- Sửa câu của ngân hàng ôn trên trình soạn tiếng Nhật giữ nguyên đoạn văn và ngôn ngữ của câu (`zh-exact-v1`). Đổi ô nhập của câu điền sang chữ Hán/pinyin thì câu chấm theo luật tiếng Trung, sang ô tiếng Nhật thì theo luật tiếng Nhật.

## Ngân hàng ôn cho lớp Nhật và Trung

Ngân hàng ôn là một bài chỉ có câu hỏi (vài slide giới thiệu), làm nguồn cho bài luyện hằng ngày. Cùng một định dạng JSON (`content/review-banks/*.json`, schema bài v1) dùng cho cả hai ngôn ngữ; bài hằng ngày, làm bài, kết quả, sổ lỗi và ôn tập xử lý như nhau.

- **Dạng bài:** `choice`, `fill`, `order` (sắp xếp mảnh) vào được bài hằng ngày; `listen`/`dictation` cần audio nên chỉ giao tay. Mỗi câu gắn một tag dạng; tag quyết định tỉ lệ trong bài hằng ngày và nhãn phần học viên thấy:

| Tag | Nhãn | Dùng cho |
| --- | --- | --- |
| `kanji` | Kanji | Tiếng Nhật: đọc/chọn cách đọc kanji |
| `hanzi`, `writing` | Chữ Hán | Nhận mặt chữ, chọn cách viết |
| `pinyin` | Pinyin | Tiếng Trung: đọc/viết pinyin có dấu thanh |
| `tones` | Thanh điệu | Tiếng Trung: phân biệt thanh |
| `vocabulary`, `meaning` | Từ vựng, Nghĩa từ | Từ hợp ngữ cảnh, chọn nghĩa |
| `measure-words` | Lượng từ | Tiếng Trung |
| `forms`, `particles` | Biến đổi từ, Trợ từ | Tiếng Nhật |
| `grammar`, `paraphrase`, `sentence-order` | Ngữ pháp, Câu cùng nghĩa, Sắp xếp câu | Cả hai |
| `reading`, `listening` | Đọc hiểu, Nghe | Cả hai |

  Tag tiếng Việt trùng một nhãn (ví dụ "Từ vựng" của trình soạn tiếng Trung, "Ngữ pháp" từ Sheet) cũng hiện như nhãn.
- **Đọc hiểu:** đặt đoạn văn vào `passage`, đề chỉ là câu hỏi. Các câu cùng `passage` được chọn liền nhau, theo thứ tự trong bài.
- **Sắp xếp câu:** `tokens` theo thứ tự đúng và `answer` là danh sách mã mảnh; mỗi mảnh dùng đúng một lần, chỉ có một thứ tự đúng với nghĩa ghi trong đề (tránh hai cụm có thể đổi chỗ mà vẫn đúng). Đặt mã mảnh ngẫu nhiên (`p27`, `p05`…), không theo thứ tự câu.
- **Tiếng Trung:** mỗi câu khai báo `"gradingProfile": "zh-exact-v1"`; ô điền dùng `inputMode` `chinese` hoặc `pinyin` (hoặc `text` khi trả lời bằng tiếng Việt); `vocab` để trống vì từ vựng có chữ Hán/pinyin nằm trong bài soạn bằng trình soạn tiếng Trung (flashcard, luyện chữ Hán lấy từ đó). Bài kiểm thử `tests/review-bank.test.ts` có một ngân hàng Trung mẫu.
- **Tiếng Nhật:** không dùng profile hoặc ô nhập tiếng Trung; đáp án kana/kanji tương đương phải khai báo đủ.
- **Đưa lên phiên bản mới:** `npm run bank:sql -- --file <bank.json> --language ja-JP|zh-Hans|zh-Hant [--lesson <mã bài>] --out <file.sql> [--commit]` kiểm tra ngôn ngữ và dạng bài rồi viết transaction. `--lesson` dùng khi bài trên server có mã khác `id` trong file (chi tiết ở [DD](detail-design/teaching-service.md#đa-dạng-dạng-bài-và-đoạn-văn-đọc-hiểu--03112026)).

## Quản lý và nâng cấp bài cho lớp Nhật–Trung

Ở `/teach`, lọc theo tên, ngôn ngữ bản soạn và trạng thái xuất bản. Dùng nhãn ngôn ngữ ở lớp và từng phiên bản khi Giao bài để tránh chọn nhầm bài Nhật/Trung hoặc giản/phồn. Bộ lọc không tự dịch bài, không gộp hai cách viết, không thay đổi nội dung lớp đang học.

| Nội dung cần duyệt | Bài tiếng Nhật | Bài tiếng Trung |
|---|---|---|
| Mục tiêu bài | Một mẫu câu/chủ điểm vừa sức, theo trình tự Minna ở pilot; ví dụ tự biên soạn | Một tình huống/mục tiêu giao tiếp, chọn giản thể hoặc phồn thể trước khi nhập |
| Từ vựng và cách đọc | Kana, kanji/furigana và nghĩa Việt nhất quán | Chữ Hán, pinyin có dấu thanh và nghĩa Việt; kiểm tra dấu cách pinyin |
| Slide | Ví dụ, hội thoại, bảng/luyện thay thế; kiểm tra nội dung dài | Dựng từ bảng từ/mẫu câu/hội thoại, xem lại bố cục trước xuất bản |
| Câu luyện | Công khai, đáp án kana/kanji phải khai báo đủ dạng được chấp nhận | Công khai, duyệt đáp án từng câu; giản/phồn và pinyin theo `zh-exact-v1` |
| Câu kiểm tra | Soạn riêng khi giao bài, mặc định Hiragana, chọn kanji/kana phù hợp mục tiêu | Soạn riêng khi giao bài, mặc định chữ Hán, chọn pinyin nếu kiểm tra cách đọc |
| Âm thanh | Nghe duyệt phát âm và furigana trên thiết bị dạy/học | Đúng giọng Trung, không fallback Nhật; nút giọng thiết bị không phải file đã duyệt |

Nâng cấp một bài đã dùng: sửa bản nháp → duyệt nội dung/đáp án → xuất bản phiên bản mới → xem lại phiên bản đó → chọn lại phiên bản trong lớp nếu muốn áp dụng → giao bài mới khi cần. Bài giao và điểm cũ giữ snapshot lúc giao. Không tái dùng ID từ/câu cũ cho ý nghĩa khác, không sửa bản đã giao để đổi điểm lịch sử. “Đã có bản xuất bản” chỉ báo bài từng xuất bản, không khẳng định nháp mới đã được duyệt.

CSV/Excel tại `/teach/import-csv` là công cụ Nhật; bài Trung dán bảng trong bước Từ vựng của wizard. Không nhập pinyin vào cột romaji của bài Nhật. Trước khi dạy thật, giáo viên chuyên môn cần duyệt bài Nhật/Trung, cách đọc, độ khó, đáp án và nguồn sử dụng; test kỹ thuật không chứng nhận chất lượng giáo trình.
