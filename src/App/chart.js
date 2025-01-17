import { ChartPageLayout } from "components/styles";
import TradeHistory from "components/TradeHistory";

export default function Chart() {
    return (
      <ChartPageLayout>
        <div className="Chart">
          <p>
            Charting is in development. For now, here is a list of the last 50 trades:
          </p>
        </div>
        <TradeHistory num={50} />
      </ChartPageLayout>
    );
}