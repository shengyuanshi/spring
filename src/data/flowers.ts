import type { Flower } from '../types/flowers';

export const flowers: Flower[] = [
  {
    id: "baihuashanbitao",
    name: "白花山碧桃",
    englishName: "White Mountain Peach",
    image: "/flowers/baihuashanbitao.jpg",
    description: "山桃和桃的天然杂交品种，未经人工干预自然形成。",
    features: [
      "树形高大开展，气势壮观",
      "白色复瓣花朵，花瓣2-3层",
      "花蕊相对完整，中心呈黄色",
      "是公园门面的理想选择"
    ],
    color: "#FFF8F0",
    bloomTime: "3-4月",
    funFact: "复瓣是指花瓣有两到三层，花蕊完整；重瓣则是花瓣多于三层，花蕊往往消失。",
    growthType: "tree",
    density: "medium",
    branchType: "curved"
  },
  {
    id: "zidingxiang",
    name: "紫丁香",
    englishName: "Lilac",
    image: "/flowers/zidingxiang.jpg",
    description: "北京最常见的丁香品种，开花时香气浓郁，北方人司空见惯，南方人值得观赏。",
    features: [
      "紫色花簇密集排列",
      "开花时香气特别浓郁",
      "耐寒性强，北方广泛种植",
      "鲁迅故居院内有鲁迅亲手种植的白丁香"
    ],
    color: "#9B7CB6",
    bloomTime: "4-5月",
    funFact: "鲁迅故居院内的两棵白丁香是鲁迅亲自栽种的，现在已经长得非常大，把整个院上空都盖满了。",
    growthType: "tree",
    density: "dense",
    branchType: "straight"
  },
  {
    id: "baidingxiang",
    name: "白丁香",
    englishName: "White Lilac",
    image: "/flowers/baidingxiang.jpg",
    description: "紫丁香的白色变种，属于同一种植物，开花同样香气四溢。",
    features: [
      "纯白花朵清新雅致",
      "属于紫丁香的变种",
      "与紫丁香同属一种植物",
      "香气浓郁，令人陶醉"
    ],
    color: "#F5F5DC",
    bloomTime: "4-5月",
    funFact: "白丁香和紫丁香实际上是同一种植物的不同变种，就像同一家族的两位姐妹。",
    growthType: "tree",
    density: "dense",
    branchType: "curved"
  },
  {
    id: "huadingxiang",
    name: "华丁香",
    englishName: "Chinese Lilac",
    image: "/flowers/huadingxiang.jpg",
    description: "与普通丁香不同，叶片呈开裂状，形态独特。",
    features: [
      "叶片开裂，形态独特",
      "与普通丁香有明显区别",
      "花朵较为小巧精致",
      "北京动物园等地可见"
    ],
    color: "#B8A1D1",
    bloomTime: "4-5月",
    funFact: "在北京别看见紫的就叫紫丁香，看见白的就叫白丁香，华丁香有着独特的开裂叶片。",
    growthType: "tree",
    density: "sparse",
    branchType: "twisted"
  },
  {
    id: "landingxiang",
    name: "蓝丁香",
    englishName: "Blue Lilac",
    image: "/flowers/landingxiang.jpg",
    description: "株型特别矮小，叶子也特别小，非常可爱。",
    features: [
      "株型矮小紧凑",
      "叶片小巧可爱",
      "淡蓝色花朵清新",
      "适合小空间种植"
    ],
    color: "#7BA7D9",
    bloomTime: "4-5月",
    funFact: "蓝丁香在北京昌平等地可见，矮小的株型让它显得格外可爱。",
    growthType: "tree",
    density: "sparse",
    branchType: "straight"
  },
  {
    id: "zhugecai",
    name: "诸葛菜",
    englishName: "Orychophragmus",
    image: "/flowers/zhugecai.jpg",
    description: "远看是一片紫色花海，近看有多种花色，甚至存在自然变异的个体。",
    features: [
      "远看紫色花海壮观",
      "近看有多种花色变化",
      "存在自然变异的个体",
      "可用于培育新品种"
    ],
    color: "#8B7BB8",
    bloomTime: "3-5月",
    funFact: "诸葛菜又叫二月兰，蹲在地上不挪窝，周围就能看到各种各样的颜色，甚至还有自然变异的高花。",
    growthType: "ground"
  },
  {
    id: "fudicai",
    name: "腹地菜",
    englishName: "Forget-me-not relative",
    image: "/flowers/fudicai.jpg",
    description: "北方特别常见的小花，细看特别像著名的勿忘我。",
    features: [
      "花朵极小但精致",
      "酷似勿忘我",
      "属于紫草科植物",
      "与勿忘我是亲戚"
    ],
    color: "#6B8DD9",
    bloomTime: "3-5月",
    funFact: "腹地菜和勿忘我（勿忘草）都是紫草科的，算是亲戚，所以长得特别像。",
    growthType: "ground"
  },
  {
    id: "ziyeli",
    name: "紫叶李",
    englishName: "Purple Leaf Plum",
    image: "/flowers/ziyeli.jpg",
    description: "常被误认为樱花，叶片紫红色，开完花后会结紫色小果。",
    features: [
      "叶片紫红色，夏季变深",
      "与樱花不同，叶片无尖儿",
      "边缘没有明显锯齿",
      "结紫色小果，可食但味道不稳定"
    ],
    color: "#8B4789",
    bloomTime: "3-4月",
    funFact: "紫叶李的果实刚长出来就是紫红色，没熟也是这色，熟了也是这色，让人看不出熟没熟，摘之前要捏捏看是否发软。",
    growthType: "tree",
    density: "medium",
    branchType: "curved"
  },
  {
    id: "yuyemei",
    name: "重瓣榆叶梅",
    englishName: "Double-flowering Plum",
    image: "/flowers/yuyemei.jpg",
    description: "常被误认为桃花，叶片形状和榆树叶一样，叶脉深陷。",
    features: [
      "粉色重瓣花朵艳丽",
      "叶片像榆树叶",
      "叶脉深陷明显",
      "与桃花有明显区别"
    ],
    color: "#FFB6C1",
    bloomTime: "3-4月",
    funFact: "重瓣榆叶梅的叶片形状和榆树叶一样，叶脉陷下去很深，这是识别它的关键特征。",
    growthType: "tree",
    density: "dense",
    branchType: "twisted"
  },
  {
    id: "chouli",
    name: "稠李",
    englishName: "Bird Cherry",
    image: "/flowers/chouli.jpg",
    description: "在北方种植较多，因为很耐寒，但花和叶都比较普通。",
    features: [
      "白色小花串状排列",
      "非常耐寒",
      "北方常见树种",
      "花和叶较为朴素"
    ],
    color: "#FFFAF0",
    bloomTime: "4-5月",
    funFact: "稠李在北方种植较多，因为很耐寒，但开的花和叶子都比较普通，没什么特别的。",
    growthType: "tree",
    density: "medium",
    branchType: "straight"
  }
];

export const getFlowerById = (id: string): Flower | undefined => {
  return flowers.find(flower => flower.id === id);
};

export const getFlowerColor = (id: string): string => {
  const flower = getFlowerById(id);
  return flower?.color || "#FFF8F0";
};
