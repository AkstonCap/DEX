import styled from '@emotion/styled';
import { Arrow, Button } from 'nexus-module';

export const overviewGridContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr; /* Left column takes 1 part, right column takes 2 parts */
  gap: 20px; /* Space between columns */
`;

export const tradeGridContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 2fr; /* Left column takes 2 parts, right column takes 2 parts */
  gap: 20px; /* Space between columns */
`;

export const PageLayout = styled.div`
  display: grid;
  grid-template-rows: auto auto;
  gap: 10px;
`;
/*height: 100vh;*/

export const DualColRow = styled.div`
  display: grid;
  grid-template-columns: 49.5% 49.5%;
  gap: 10px;
  overflow: auto;
`;

export const SingleColRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 10px;
  overflow: auto;
  width: 98%;
  margin: 0 auto;
`;

export const TopRow = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 800px));
  justify-content: center;
`;
//grid-template-columns: 59% 40%; overflow: auto;

export const BottomRow = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 500px));
  justify-content: center;
`;
//grid-template-columns: 32% 31% 35%; overflow: auto;

export const TradeBottomRow = styled.div`
  display: grid;
  grid-template-columns: 49% 50%;
  gap: 10px;
  overflow: auto;
`;

export const OrderTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;

  th:nth-of-type(1) {
    width: 20%;
  }

  th:nth-of-type(2) {
    width: 40%;
  }

  th:nth-of-type(3) {
    width: 40%;
  }

  th {
    padding: 2px;
    text-align: right;
    padding-right: 5px;
    font-size: 18px;
  }

  td {
    padding: 2px;
    text-align: right;
    padding-right: 8px;
  }

`;

export const OrderbookTableHeader = styled.thead`
  color: white;
  th {
    padding-right: 12px;
  }
`;

export const OrderbookTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'ask' ? 'red' : '#7cfc00')};
  padding-right: 8px;
`;

export const TradeTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'ask' ? '#7cfc00' : 'red')};
  padding-right: 8px;
`;

export const MyTradeTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'bid' ? '#7cfc00' : 'red')};
  padding-right: 8px;
`;

export const MyOrdersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;

  th:nth-of-type(1) {
    width: 20%;
  }

  th:nth-of-type(2) {
    width: 25%;
  }

  th:nth-of-type(3) {
    width: 25%;
  }

  th:nth-of-type(4) {
    width: 28%;
  }

  th {
    padding: 2px;
    text-align: right;
    padding-right: 12px;
    font-size: 18px;
  }

  td {
    padding: 2px;
    text-align: right;
    padding-right: 8px;
  }

`;

export const MyOrdersTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'bid' ? '#7cfc00' : 'red')};
  padding-right: 8px;
`;

export const MyUnconfirmedOrdersTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'bid' ? '#90EE90' : '#CD5C5C')};
  opacity: 0.6;
  background-color: rgba(128, 128, 128, 0.1);
  padding-right: 8px;
`;

export const MarketsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;

  th:nth-of-type(1) {
    width: 15%;
  }

  th:nth-of-type(2) {
    width: 15%;
  }

  th:nth-of-type(3) {
    width: 23%;
  }

  th:nth-of-type(4) {
    width: 23%;
  }

  th:nth-of-type(5) {
    width: 23%;
  }

  th {
    padding: 2px;
    text-align: right;
    padding-right: 5px;
    font-size: 18px;
    color: #6dcefe;
  }

  td {
    padding: 2px;
    text-align: right;
    padding-right: 8px;
    font-size: 12px;
    color: white;
  }

`;

export const ChangeText = styled.span`
  color: ${(props) => (props.change > 0 ? '#7cfc00' : 'red')};
`;

export const ChangeArrow = styled(Arrow)`
  color: ${(props) => (props.change > 0 ? 'green' : 'red')};
`;

export const Line = styled.div({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  columnGap: 20,
  marginTop: '1em',
});

export const Label = styled.div(({ theme }) => ({
  color: theme.primary,
  fontWeight: 'bold',
}));

export const Value = styled.div({
  fontSize: 24,
});

export function SummaryValue({ summary, prop, percentage }) {
  if (!summary) {
    return <Value>N/A</Value>;
  }

  const value = summary?.[prop];
  if (value === null || value === undefined) {
    return <Value>N/A</Value>;
  }

  return <Value>{value + (percentage ? '%' : '')}</Value>;
}

export const ChartPageLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(1000px, 1fr));
  gap: 20px;
  overflow: auto;
  padding: 10px;
`;

export const DepthPageLayout = styled.div`
  display: grid;
  grid-template-rows: Auto Auto;
  gap: 10px;
  overflow: auto;
`;

export const DepthPageBottomRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  overflow: auto;
`;

export const BidButton = styled(Button)`
  && {
    /* Double ampersand ensures higher specificity */
    border: 2px solid #004d00 !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'bid' ? '#004d00' : 'transparent'} !important;
    color: ${({ orderMethod }) =>
      orderMethod === 'bid' ? 'white' : 'inherit'} !important;
  }
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 18px;
  cursor: pointer;
`;

export const AskButton = styled(Button)`
  && {
    /* Double ampersand ensures higher specificity */
    border: 2px solid #ab2328 !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'ask' ? '#ab2328' : 'transparent'} !important;
    color: ${({ orderMethod }) =>
      orderMethod === 'ask' ? 'white' : 'inherit'} !important;
  }
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 18px;
  cursor: pointer;
`;

export const ExecuteButton = styled(Button)`
  && {
    /* Double ampersand ensures higher specificity */
    border: 2px solid #025e93 !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'execute' ? '#025e93' : 'transparent'} !important;
    color: ${({ orderMethod }) =>
      orderMethod === 'execute' ? 'white' : 'inherit'} !important;
  }
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 18px;
  cursor: pointer;
`;

export const MarketFillButton = styled(Button)`
  && {
    /* Double ampersand ensures higher specificity */
    border: 2px solid #0ca4fb !important;
    background-color: transparent !important;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 18px;
  cursor: pointer;
`;

export const TradeFormContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;


export const SubmitButton = styled(Button)`
  && {
    //border: 2px solid white !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'execute' 
        ? '#025e93' 
        : orderMethod === 'ask' 
        ? '#ab2328' 
        : orderMethod === 'bid' 
        ? '#004d00' 
        : 'transparent'} !important;
    color: ${({ orderMethod }) =>
      orderMethod === 'execute' ? 'white' : 'inherit'} !important;
  }
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 18px;
  cursor: pointer;
`;

export const TickerText = styled.span`
  color: yellow;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 3px;
`;
//*/

export const MarketsTableHeader = styled.thead`
  color: white;
  th {
    padding-right: 12px;
  }
`;

export const WideMarketsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;

  th:nth-of-type(1) {
    width: 9%;
  }

  th:nth-of-type(2) {
    width: 10%;
  }

  th:nth-of-type(3) {
    width: 11%;
  }

  th:nth-of-type(4) {
    width: 11%;
  }

  th:nth-of-type(5) {
    width: 11%;
  }

  th:nth-of-type(6) {
    width: 15%;
  }

  th:nth-of-type(7) {
    width: 14%;
  }

  th:nth-of-type(8) {
    width: 17%;
  }

  th {
    padding: 2px;
    text-align: right;
    padding-right: 5px;
    font-size: 18px;
    color: #6dcefe;
  }

  td {
    padding: 2px;
    text-align: right;
    padding-right: 8px;
    font-size: 12px;
    color: white;
  }

`;

export const AssetWideMarketsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;

  th:nth-of-type(1) {
    width: 20%;
  }
  th:nth-of-type(2) {
    width: 20%;
  }
  th:nth-of-type(3) {
    width: 15%;
  }
  th:nth-of-type(4) {
    width: 15%;
  }
  th:nth-of-type(5) {
    width: 30%;
  }

  th {
    padding: 2px;
    text-align: right;
    padding-right: 5px;
    font-size: 18px;
    color: #6dcefe;
  }

  td {
    padding: 2px;
    text-align: right;
    padding-right: 8px;
    font-size: 12px;
    color: white;
  }
`;

export function formatTokenName(token) {
    if (typeof token === 'string' && token.length > 20) {
      return token.slice(0, 4) + '...' + token.slice(-4);
    }
    return token;
}