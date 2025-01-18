import { ChartPageLayout } from "components/styles";
import TradeHistory from "components/TradeHistory";

export default function Chart() {
    return (
      <ChartPageLayout>
        <div className="Chart">
          <p>
            Charts coming soon..
          </p>
        </div>
        <TradeHistory num={50} />
      </ChartPageLayout>
    );
}