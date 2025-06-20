import { ChartPageLayout } from "components/styles";
import TradeHistory from "components/TradeHistory";
import ChartWindow from "components/ChartWindow";



export default function Chart() {
    return (
      <ChartPageLayout>
        <ChartWindow />
        <TradeHistory num={50} />
      </ChartPageLayout>
    );
}