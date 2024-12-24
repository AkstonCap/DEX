import styled from '@emotion/styled';

export const overviewGridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr; /* Left column takes 1 part, right column takes 2 parts */
  gap: 20px; /* Space between columns */
`;

export const tradeGridContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 2fr; /* Left column takes 2 parts, right column takes 2 parts */
  gap: 20px; /* Space between columns */
`;