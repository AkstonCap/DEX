import { ChartPageLayout } from "components/styles";
import OrderBookComp from "components/OrderBookComp";

export default function MarketDepth() {
  return (
    <ChartPageLayout>
      <div className="Chart">
        <h1>Welcome to the DEX</h1>
          <p>
            Market Depth TBA
          </p>
        </div>
      <OrderBookComp num={20} />
    </ChartPageLayout>
  );
}