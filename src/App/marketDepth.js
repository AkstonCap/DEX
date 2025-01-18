import { DepthPageLayout, DepthPageBottomRow } from "components/styles";
import OrderBookComp from "components/OrderBookComp";
import BidBook from "components/BidBook";
import AskBook from "components/AskBook";

export default function MarketDepth() {
  return (
    <DepthPageLayout>
      <div className="text-center">
        <p>
          Market depth chart coming soon..
        </p>
      </div>
      <DepthPageBottomRow>
        <BidBook num={50} />
        <AskBook num={50} />
      </DepthPageBottomRow>
    </DepthPageLayout>
  );
}