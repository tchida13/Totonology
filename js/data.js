// 診断データ: 軸・質問・16タイプ
window.AXES = [
  { id: "heat",  first: { code: "H", label: "高温ガッツリ" }, second: { code: "S", label: "低温じっくり" }, title: "熱の好み" },
  { id: "cool",  first: { code: "W", label: "水風呂派" },     second: { code: "A", label: "外気浴派" },     title: "クールダウン" },
  { id: "mate",  first: { code: "O", label: "ひとりサウナ" }, second: { code: "T", label: "みんなでサウナ" }, title: "過ごし方" },
  { id: "style", first: { code: "R", label: "計画・ルーティン" }, second: { code: "F", label: "気まま・直感" }, title: "スタイル" },
];

// dir: +1 = 「そう思う」で first 側 / -1 = 「そう思う」で second 側
// decisive: 同点時の決め手にする質問（各軸にちょうど1問）
window.QUESTIONS = [
  { axis: "heat", dir: 1,  text: "サウナ室は100℃近い高温で、じりじり汗が噴き出す感覚が好きだ" },
  { axis: "heat", dir: -1, decisive: true, text: "70〜80℃くらいの穏やかな室温で、長めにじっくり入りたい" },
  { axis: "heat", dir: 1,  text: "ロウリュやアウフグースで熱波を浴びるのが楽しみだ" },
  { axis: "heat", dir: -1, text: "熱すぎるサウナは苦手で、心地よさを優先したい" },
  { axis: "heat", dir: 1,  text: "サウナ室では上段に座って、しっかり熱を浴びたい" },
  { axis: "heat", dir: -1, text: "下段や中段で、ゆったり体を温めるほうが落ち着く" },

  { axis: "cool", dir: 1,  text: "キンキンの水風呂に肩までドボンと入るのが快感だ" },
  { axis: "cool", dir: -1, decisive: true, text: "水風呂よりも、外気浴でぼーっとする時間のほうが好きだ" },
  { axis: "cool", dir: 1,  text: "水風呂の温度や水質には、ちょっとこだわりがある" },
  { axis: "cool", dir: -1, text: "ととのい椅子で風を感じながら、空を眺めるのが至福だ" },
  { axis: "cool", dir: 1,  text: "サウナのあとは、まず冷たい水で一気に体を締めたい" },
  { axis: "cool", dir: -1, text: "冷たい水は苦手で、外気や水シャワーで少しずつ冷ましたい" },

  { axis: "mate", dir: 1, decisive: true, text: "サウナは基本ひとりで、自分と向き合う時間にしたい" },
  { axis: "mate", dir: -1, text: "友達や家族と一緒に行って、感想を言い合うのが楽しい" },
  { axis: "mate", dir: 1,  text: "サウナ室で話しかけられるより、静かに過ごしたい" },
  { axis: "mate", dir: -1, text: "サウナで知らない人と会話が弾むのも悪くない" },
  { axis: "mate", dir: 1,  text: "サウナの感想は、自分の中だけで味わえれば十分だ" },
  { axis: "mate", dir: -1, text: "ととのったあとは、誰かと飲み物を片手に語り合いたい" },

  { axis: "style", dir: 1, decisive: true, text: "「サウナ12分→水風呂1分→休憩10分」など、自分の黄金ルールがある" },
  { axis: "style", dir: -1, text: "その日の体調と気分で、入る時間も回数もなりゆきで決める" },
  { axis: "style", dir: 1,  text: "行く前に施設の情報やレビューをしっかり調べる" },
  { axis: "style", dir: -1, text: "旅先で偶然見つけたサウナにふらっと入るのが好きだ" },
  { axis: "style", dir: 1,  text: "サウナの回数や時間を記録して、あとで振り返るのが好きだ" },
  { axis: "style", dir: -1, text: "サウナ前後の予定も、その場の気分で決めたい" },
];

// 4グループ(熱の好み × 過ごし方)。コードの 1文字目と 3文字目で決まる。color は結果画面のテーマ色、photo は結果ヒーローの背景写真
window.GROUPS = {
  HO: { photo: "assets/photos/loyly.jpg", name: "求道者", desc: "ひとりで熱と向き合う", color: "#C0553B" },
  HT: { photo: "assets/photos/aufguss.jpg", name: "盛り上げ隊", desc: "熱さを仲間と分かち合う", color: "#C98A2B" },
  SO: { photo: "assets/photos/sauna-room.jpg", name: "静寂派", desc: "静けさの中でととのう", color: "#4C86A8" },
  ST: { photo: "assets/photos/goods.jpg", name: "ほっこり隊", desc: "ゆるく穏やかに寄り添う", color: "#5A9A74" },
};

// おすすめサウナの実在施設。各タイプの spots から id で参照する。
// 料金・営業時間など変動する情報は載せず、訪問前に公式情報を確認してもらう前提にする
window.SPOTS = {
  saunatokyo:   { name: "サウナ東京", area: "東京・赤坂", vibe: "都会のリッチなサウナ", note: "男性専用。食事処「サ飯東京」を併設" },
  omoriyu:      { name: "大森湯", area: "東京・大田区", vibe: "昭和ストロングな銭湯サウナ", note: "高温のサウナが名物の街の銭湯" },
  earthboat:    { name: "Earthboat", area: "栃木・那須ほか全国", vibe: "大自然に囲まれたアウトドアサウナ", note: "全室プライベート薪サウナ付きの宿泊施設。那須・黒姫・北軽井沢などにある" },
  shikiji:      { name: "サウナしきじ", area: "静岡・静岡市", vibe: "天然水の水風呂が名物の名店", note: "地下の天然水かけ流しの水風呂と薬草サウナ、サウナ飯で知られる" },
  hokuou:       { name: "サウナ&カプセルホテル 北欧", area: "東京・上野", vibe: "駅近・24時間のストイックな男の聖域", note: "男性専用。上野駅から徒歩約1分、サウナのみの利用も可" },
  sokaken:      { name: "草加健康センター", area: "埼玉・草加", vibe: "熱波イベントが盛り上がる大型施設", note: "ロウリュやアウフグースなどのイベントが豊富" },
  laqua:        { name: "スパ ラクーア", area: "東京・後楽園", vibe: "都心の天然温泉つき大型スパ", note: "男女で利用できる。年齢の利用条件は公式情報で確認を" },
  shibuyasaunas:{ name: "渋谷SAUNAS", area: "東京・渋谷", vibe: "多彩なサウナを巡る実験場", note: "8種9つのサウナを備え、男女のエリアが日替わりで入れ替わる" },
  umeyu:        { name: "サウナの梅湯", area: "京都・京都市", vibe: "地下水の水風呂が心地よい老舗銭湯", note: "地下水かけ流しの水風呂が自慢の街の銭湯" },
  koganeyu:     { name: "黄金湯", area: "東京・錦糸町", vibe: "ビアバー併設のモダン銭湯", note: "男女で異なるサウナがあり、水曜は男女入れ替え" },
  thesauna:     { name: "The Sauna", area: "長野・信濃町", vibe: "川で冷やす森のアウトドアサウナ", note: "事前予約制。川を水風呂として使える" },
  miharashi:    { name: "みはらしの湯", area: "長野県", vibe: "南アルプスを望む絶景の温泉", note: "外気浴スペースからの眺めが評判" },
};

// 16タイプ。コード = 熱(H/S) + 冷(W/A) + 人(O/T) + 流(R/F)
window.TYPES = {
  HWOR: { name: "修行僧", en: "The Ascetic", tagline: "熱と冷を極める、ストイックな求道者",
    desc: "高温サウナと冷水に黙々と向き合い、決めたセットを正確にこなすタイプ。ととのいは『積み重ねの先にある』と信じています。",
    strengths: ["自己管理が完璧", "熱にも冷水にも強い", "セットの再現性が高い"], cautions: ["無理をしがち。水分補給と休憩は忘れずに"],
    sauna: "高温サウナ＋15℃前後の水風呂が揃う本格派施設", spots: ["omoriyu", "hokuou"], matchReason: "ストイックなあなたの隣で、ゆるふわ仲間は力みをほどいてくれる。追い込んだ日も、のんびり戻れる安心感がある。", match: "SATF" },
  HWOF: { name: "一匹狼", en: "The Lone Wolf", tagline: "気まぐれに現れ、熱と冷水を総なめにする孤高の人",
    desc: "ルールは持たず、直感で熱いほうへ冷たいほうへ。ひとりで感覚を研ぎ澄ませ、その日のベストを見つけます。",
    strengths: ["感覚が鋭い", "どこでも楽しめる", "身軽な行動力"], cautions: ["体調の変化に気づきにくいので、時々は立ち止まって"],
    sauna: "深夜まで営業している都市型サウナ", spots: ["saunatokyo", "hokuou"], matchReason: "気まぐれに動いても、お世話係が帰る場所を整えてくれる。自由さを責めずに受け止めてくれる存在。", match: "SATR" },
  HWTR: { name: "熱血キャプテン", en: "The Captain", tagline: "仲間を引っ張る、サウナ部の部長",
    desc: "『今日は3セットいくぞ！』と仲間を率いる存在。熱さも冷たさも一緒に分かち合ってこそ、と考えています。",
    strengths: ["リーダーシップ", "場を盛り上げる", "計画的で面倒見がいい"], cautions: ["ペースを仲間に押し付けすぎないで"],
    sauna: "熱波イベントのあるサウナ、貸切サウナ", spots: ["sokaken", "shibuyasaunas"], matchReason: "前のめりな熱を、夢見人の静けさが一度ゆるめてくれる。外気浴でふっと我に返る時間をくれる相手。", match: "SAOF" },
  HWTF: { name: "ムードメーカー", en: "The Entertainer", tagline: "サウナ室の空気を一瞬で明るくする人気者",
    desc: "熱波も水風呂もリアクション全開！初対面でもすぐ打ち解け、サウナ後の一杯まで含めて一日を楽しみます。",
    strengths: ["社交的", "ノリが良い", "新しい出会いを呼ぶ"], cautions: ["静かに過ごしたい人への配慮も忘れずに"],
    sauna: "サウナ後に飲食できる大型スパ・銭湯", spots: ["laqua", "sokaken"], matchReason: "にぎやかな空気の合間に、瞑想家の静けさが深呼吸の時間をくれる。盛り上がりのあとに、穏やかに整える。", match: "SAOR" },
  HAOR: { name: "サウナ職人", en: "The Craftsman", tagline: "熱と風を操る、ととのいの設計者",
    desc: "高温でしっかり温まり、外気浴でゆっくり整える。自分なりの『最適解』を磨き続けるこだわり派です。",
    strengths: ["研究熱心", "再現性の高いととのい", "細部へのこだわり"], cautions: ["理想に縛られず、たまにはなりゆきも"],
    sauna: "外気浴スペースが充実した高温サウナ", spots: ["shikiji", "thesauna"], matchReason: "職人のこだわりを、語り部が楽しそうに聞いてくれる。整えた時間を、言葉にして分かち合える。", match: "SWTF" },
  HAOF: { name: "風来坊", en: "The Drifter", tagline: "熱を浴び、風に吹かれ、また次の町へ",
    desc: "ふらりと入って、ガッツリ温まって、風に吹かれて帰る。自由気ままなひとりサウナの旅人です。",
    strengths: ["自由で軽やか", "どこでも馴染む", "変化を楽しめる"], cautions: ["その日の体調確認は忘れずに"],
    sauna: "旅先の地元サウナ、野外サウナ", spots: ["thesauna", "earthboat"], matchReason: "風のように動く風来坊を、案内人がやさしく迎えてくれる。旅先でも道しるべになってくれる存在。", match: "SWTR" },
  HATR: { name: "サ旅の開拓者", en: "The Pioneer", tagline: "計画を立てて、仲間と全国のサウナを巡る",
    desc: "遠征プランも完璧、同行者へのおすすめも的確。熱いサウナと外気浴の絶景をみんなで楽しみたいタイプです。",
    strengths: ["情報収集力", "段取り上手", "思い出づくりが得意"], cautions: ["詰め込みすぎ注意。余白も旅の楽しみ"],
    sauna: "絶景外気浴のあるリゾート系サウナ", spots: ["miharashi", "earthboat"], matchReason: "計画的な旅の途中で、氷の詩人の静かな感性が、思いがけない発見を教えてくれる。", match: "SWOF" },
  HATF: { name: "宴のホスト", en: "The Party Starter", tagline: "熱くなって、風に当たって、乾杯まで一直線",
    desc: "とにかく楽しむのが信条。サウナ室ではトークも弾み、外気浴では笑顔、最後はサウナ飯で締めます。",
    strengths: ["明るい", "誰とでも仲良くなる", "楽しむ天才"], cautions: ["飲酒前後の入浴は危険。お酒はサウナの後、水分補給の後に"],
    sauna: "サウナ飯が名物の銭湯・スパ", spots: ["koganeyu", "shikiji"], matchReason: "勢いで盛り上がる宴を、博士の知識が安心して楽しめる土台にしてくれる。", match: "SWOR" },
  SWOR: { name: "サウナ博士", en: "The Scholar", tagline: "データと理論で、ととのいを解き明かす",
    desc: "温度・時間・水温をメモし、自分にとって最適なセットを探求。静かな環境で、じっくり実験するのが好きです。",
    strengths: ["分析力", "継続力", "知識が豊富"], cautions: ["考えすぎず、感覚も大切に"],
    sauna: "温度設定が丁寧に管理された静かな施設", spots: ["shibuyasaunas"], matchReason: "博士の理論に、宴のホストの熱が加わると、ととのいが「楽しい体験」に変わる。", match: "HATF" },
  SWOF: { name: "氷の詩人", en: "The Ice Poet", tagline: "静かな水面に、言葉にならない感覚を見つける",
    desc: "やさしい熱で体を温め、冷たい水でふっと我に返る。ひとりで感じるその一瞬を大事にする感性派です。",
    strengths: ["感受性豊か", "静けさを楽しめる", "水風呂との相性◎"], cautions: ["冷えすぎにはご注意"],
    sauna: "水風呂の質が良い、静かな小規模サウナ", spots: ["umeyu", "shikiji"], matchReason: "開拓者の地図が、ひとりでは辿り着けない水風呂の景色へ連れて行ってくれる。", match: "HATR" },
  SWTR: { name: "サウナ案内人", en: "The Guide", tagline: "初心者にやさしく入り方を教えるお世話役",
    desc: "『無理しなくていいよ』と声をかけ、相手のペースに合わせて計画を立てます。サウナの魅力を広める伝道師です。",
    strengths: ["思いやり", "説明が上手", "安心感がある"], cautions: ["自分のととのいも後回しにしないで"],
    sauna: "初心者向けの温度設定、男女で行ける施設", spots: ["laqua", "koganeyu"], matchReason: "案内人の丁寧さと、風来坊の自由さ。新しい入り方や場所を、教えてもらえる出会い。", match: "HAOF" },
  SWTF: { name: "癒しの語り部", en: "The Storyteller", tagline: "ゆるっと入って、ゆるっと語り合う",
    desc: "低めの温度でのんびり、冷たい水でさっぱり。サウナ後の雑談まで含めて、ほっこりした時間を楽しみます。",
    strengths: ["聞き上手", "気配り上手", "場を和ませる"], cautions: ["長居しすぎ・水分不足に注意"],
    sauna: "地元の銭湯サウナ、のんびり系スパ", spots: ["umeyu", "koganeyu"], matchReason: "ゆるく語り合う時間に、職人の確かな段取りが心地よいリズムを足してくれる。", match: "HAOR" },
  SAOR: { name: "瞑想家", en: "The Meditator", tagline: "穏やかな熱と風の中で、心を整える",
    desc: "決まったリズムで、低めの温度でゆっくり温まり、外気浴でゆっくり呼吸。サウナを『整える時間』として大切にします。",
    strengths: ["落ち着き", "習慣化が得意", "心の安定"], cautions: ["たまには冒険も。違うサウナで刺激を"],
    sauna: "静かな外気浴スペースのある施設", spots: ["earthboat", "miharashi"], matchReason: "ムードメーカーの明るさが、ひとりの時間を大切にする心をやさしくほぐしてくれる。", match: "HWTF" },
  SAOF: { name: "夢見人", en: "The Dreamer", tagline: "気づけば外気浴で雲を数えている",
    desc: "時計も見ず、ただ心地よさに身を任せます。ぼんやりと空を眺めながら、ふわっとととのう天然タイプです。",
    strengths: ["リラックス上手", "自然体", "感覚で最適を掴む"], cautions: ["入りすぎ・休みすぎで時間を忘れがち"],
    sauna: "自然に囲まれた露天・テントサウナ", spots: ["earthboat", "thesauna"], matchReason: "まっすぐ引っ張ってくれる熱血キャプテンのおかげで、ひとりでは行かない熱の世界に出会える。", match: "HWTR" },
  SATR: { name: "サウナのお世話係", en: "The Caretaker", tagline: "みんなが気持ちよく過ごせるよう、さりげなく整える",
    desc: "タオルを用意したり、水分補給を促したり。仲間のコンディションにも気を配る、みんなの安心役です。",
    strengths: ["気遣い", "計画性", "チームのバランサー"], cautions: ["自分のケアも後回しにしないで"],
    sauna: "家族・グループで使いやすい施設", spots: ["laqua", "koganeyu"], matchReason: "一匹狼の気まぐれが、いつもの段取りに新鮮な風を入れてくれる。予定どおりにいかない時間が、思い出になる。", match: "HWOF" },
  SATF: { name: "ゆるふわ仲間", en: "The Chill Companion", tagline: "のんびり一緒に、ただそこにいる心地よさ",
    desc: "ゆるい温度で、ゆるい時間。会話してもしなくても、一緒にいるだけで満たされる平和主義者です。",
    strengths: ["癒し系", "協調性", "誰とでも居心地が良い"], cautions: ["意見を言うことも時には大切"],
    sauna: "ファミリー向け・ゆったりスパ", spots: ["koganeyu", "laqua"], matchReason: "修行僧の真剣さが、ゆるい時間に一本の芯を通してくれる。ひとりでは入らない熱の世界へ、そっと連れ出してもらえる。", match: "HWOR" },
};

// 結果発表前の「ため演出」。暗い所から明るい所へ、水風呂でゆっくり意識がほどけていく。line は段ごとの一言(うっすら表示)、name は読み上げ用、ms はその段の長さ
window.RITUAL_TITLE = "回答を分析しています"; // ため演出の間、うっすら表示する(分析中であることを伝える)
window.RITUAL = [
  { name: "水風呂", line: "ゆっくり、深呼吸してお待ちください", ms: 3400 },
  { name: "休憩", line: "息を吐くたびに、力が抜けていきます", ms: 3200 },
  { name: "外気浴", line: "やわらかな風を感じながら、もう少しだけ", ms: 3000 },
  { name: "整い", line: "まもなく、結果をお届けします", ms: 2400 },
];
