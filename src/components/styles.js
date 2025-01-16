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
  grid-template-rows: 49% 49%;
  height: 180vh;
  gap: 10px;
`;

export const TopRow = styled.div`
  display: grid;
  grid-template-columns: 59% 39%;
  gap: 10px;
  overflow: auto;
`;

export const BottomRow = styled.div`
  display: grid;
  grid-template-columns: 31% 31% 35%;
  gap: 10px;
  overflow: auto;
`;

export const TradeBottomRow = styled.div`
  display: grid;
  grid-template-columns: 49% 49%;
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
  background-color: #f1f1f1;
`;

export const OrderbookTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'ask' ? 'red' : 'green')};
  padding-right: 8px;
`;

export const TradeTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'ask' ? 'green' : 'red')};
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
    width: 40%;
  }

  th:nth-of-type(3) {
    width: 40%;
  }

  th:nth-of-type(4) {
    width: 25%;
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

export const MyOrdersTableRow = styled.tr`
  cursor: pointer;
  color: ${(props) => (props.orderType === 'ask' ? 'green' : 'red')};
  padding-right: 8px;
`;

export const ChangeText = styled.span`
  color: ${(props) => (props.change > 0 ? 'green' : 'red')};
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
  grid-template-columns: 65% 30%;
  gap: 10px;
  overflow: auto;
`;

export const BidButton = styled(Button)`
  && {
    /* Double ampersand ensures higher specificity */
    border: 2px solid green !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'bid' ? 'green' : 'transparent'} !important;
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
    border: 2px solid red !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'ask' ? 'red' : 'transparent'} !important;
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
    border: 2px solid blue !important;
    background-color: ${({ orderMethod }) =>
      orderMethod === 'execute' ? 'blue' : 'transparent'} !important;
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
        ? 'blue' 
        : orderMethod === 'ask' 
        ? 'red' 
        : orderMethod === 'bid' 
        ? 'green' 
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
//*/