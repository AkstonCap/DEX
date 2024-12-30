import styled from '@emotion/styled';
import { Arrow } from 'nexus-module';

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
  grid-template-rows: 60% 40%;
  height: 100vh;
  gap: 10px;
`;

export const TopRow = styled.div`
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 10px;
`;

export const BottomRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
`;

export const OrderTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;

  th, td {
    border: 1px solid #ccc;
    padding: 8px;
    text-align: right;
  }
`;

export const OrderbookTableHeader = styled.thead`
  background-color: #f1f1f1;
`;

export const OrderbookTableRow = styled.tr`
  cursor: pointer;
`;

export const OrderbookTableData = styled.td`
  text-align: right;
`;

export const ChangeText = styled.span`
  color: ${(props) => (props.change > 0 ? 'green' : 'red')};
`;

export const ChangeArrow = styled(Arrow)`
  color: ${(props) => (props.change > 0 ? 'green' : 'red')};
`;
