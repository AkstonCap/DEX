import { ChartPageLayout } from "components/styles";
import OrderBookComp from "components/OrderBookComp";

export default function MarketDepth() {
  return (
    <ChartPageLayout>
      <div>
          <p>
            Market Depth coming soon..
          </p>
        </div>
      <OrderBookComp num={20} />
    </ChartPageLayout>
  );
}