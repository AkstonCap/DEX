import styled from '@emotion/styled';

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

export const TradingContainer = styled.div`
  background: #f5f5f5;
  padding: 10px;
`;