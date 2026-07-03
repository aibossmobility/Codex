export type PapaPillar = "Purpose" | "Authority" | "Presence" | "Alignment";

export type PapaAiPromoSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  folder: string;
};

export type PapaAiPromoWeek = {
  weekNumber: number;
  isoWeek: string;
  startsOn: string;
  pillar: PapaPillar;
  topic: string;
  themeLine: string;
  imagePath: string;
  platform?: string;
};

export const papaAiGraphicsLibrary = {
  rootFolderId: "17aGEWs_6CMoHrQ5i6gOhw6dwzGg70wgK",
  rootFolderUrl: "https://drive.google.com/drive/folders/17aGEWs_6CMoHrQ5i6gOhw6dwzGg70wgK",
  folderName: "Papa Life AI Launch Graphics – June 30, 2026",
  publicAssetBasePath: "/images/papa-ai-promos",
  manifestPath: "/images/papa-ai-promos/manifest.json",
  sourceFolders: {
    week1Launch: {
      id: "18zKJNFpndZcN8CBsAp2_H5JlX57uo4PD",
      url: "https://drive.google.com/drive/folders/18zKJNFpndZcN8CBsAp2_H5JlX57uo4PD",
    },
    templates: {
      id: "1PSsv6nbn0dknyz_p-EIgPVgJHjOKg_Iz",
      url: "https://drive.google.com/drive/folders/1PSsv6nbn0dknyz_p-EIgPVgJHjOKg_Iz",
    },
    logos: {
      id: "1xbyf40BorIBFmGv74SwkpdFl2MWUtgi-",
      url: "https://drive.google.com/drive/folders/1xbyf40BorIBFmGv74SwkpdFl2MWUtgi-",
    },
    weeklyPromoRotation: {
      id: "1YzjOxH8H-x8YRtfvOuSBgDTPWRcBpEVt",
      url: "https://drive.google.com/drive/folders/1YzjOxH8H-x8YRtfvOuSBgDTPWRcBpEVt",
      subfolders: {
        purpose: {
          id: "1ktxu3CF0g1VLfBcwQXkWdQ_ePOUYZXAW",
          url: "https://drive.google.com/drive/folders/1ktxu3CF0g1VLfBcwQXkWdQ_ePOUYZXAW",
        },
        authority: {
          id: "1iQKTp5wvQsokjm9aspuv9wtpsdF3lGjw",
          url: "https://drive.google.com/drive/folders/1iQKTp5wvQsokjm9aspuv9wtpsdF3lGjw",
        },
        presence: {
          id: "1_PBgckXf6ZLSvZbvSJ5CCNNXBbYycEq1",
          url: "https://drive.google.com/drive/folders/1_PBgckXf6ZLSvZbvSJ5CCNNXBbYycEq1",
        },
        alignment: {
          id: "1Y2PoKhXeXTqIM-R8gFksraae08UgnFdz",
          url: "https://drive.google.com/drive/folders/1Y2PoKhXeXTqIM-R8gFksraae08UgnFdz",
        },
      },
    },
  },
  filenamePattern:
    "YYYY-W##_pillar_topic-slug_platform_WIDTHxHEIGHT.ext",
  exampleFilename:
    "2026-W27_purpose_ai-launch_website-hero_1600x900.png",
};

export const papaAiPromoSizes: PapaAiPromoSize[] = [
  { id: "website-hero", label: "Website hero", width: 1600, height: 900, folder: "Website" },
  { id: "website-promo", label: "Website promo", width: 1254, height: 1254, folder: "Website" },
  { id: "website-feature", label: "Website feature", width: 1024, height: 1536, folder: "Website" },
  { id: "website-inline", label: "Website inline", width: 1200, height: 628, folder: "Website" },
  { id: "instagram-square", label: "Instagram square", width: 1080, height: 1080, folder: "Instagram" },
  { id: "instagram-story", label: "Instagram story", width: 1080, height: 1920, folder: "Instagram" },
  { id: "facebook-linkedin", label: "Facebook/LinkedIn", width: 1200, height: 628, folder: "Facebook-LinkedIn" },
  { id: "x-post", label: "X post", width: 1600, height: 900, folder: "X" },
  { id: "youtube-community", label: "YouTube community", width: 1280, height: 720, folder: "YouTube" },
];

export const papaAiPromoRotation: PapaPillar[] = ["Purpose", "Authority", "Presence", "Alignment"];

export const papaAiCurrentPromo: PapaAiPromoWeek = {
  weekNumber: 1,
  isoWeek: "2026-W27",
  startsOn: "2026-06-30",
  pillar: "Purpose",
  topic: "AI Launch",
  themeLine: "Know why you are showing up before you decide what to say.",
  imagePath: "/images/papa-ai-promos/current/2026-W27_purpose_ai-launch_website-promo_1254x1254.png",
  platform: "website-promo",
};
