import { DepthPageLayout, DepthPageBottomRow } from "components/styles";
import OrderBookComp from "components/OrderBookComp";
import BidBook from "components/BidBook";
import AskBook from "components/AskBook";
import DepthChart from "components/DepthChart";

export default function MarketDepth() {
  return (
    <DepthPageLayout>
      <DepthChart />
      <DepthPageBottomRow>
        <BidBook num={50} />
        <AskBook num={50} />
      </DepthPageBottomRow>
    </DepthPageLayout>
  );
}