import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export default function Loading() {
  return (
    <RouteLoadingScreen
      eyebrow="Spreadsheet import"
      title="Upload your spreadsheet. Launch the pool your group already knows."
      description="If your pool lives in Excel today, FY Pools can turn that workbook into a fully working hosted pool with user picks, brackets, scoring, standings, and commissioner tools."
    />
  );
}
