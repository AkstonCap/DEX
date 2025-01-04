import { ChartPageLayout } from "components/styles";
import TradeHistory from "components/TradeHistory";

export default function Chart() {
    return (
      <ChartPageLayout>
        <div className="Chart">
          <h1>Welcome to the DEX</h1>
          <p>
            Chart TBA
          </p>
        </div>
        <TradeHistory num={20} />
      </ChartPageLayout>
    );
}