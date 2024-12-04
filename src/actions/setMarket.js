import * as TYPE from './types';
import { setBaseToken, setMarketPair, setOrderToken } from './actionCreators';

export const setMarket = () => {
    const newOrderToken = useSelector((state) => state.ui.inputValue.orderTokenField);
    const newBaseToken = useSelector((state) => state.ui.inputValue.baseTokenField);
    setBaseToken(newBaseToken);
    setOrderToken(newOrderToken);
    const concatenatedMarket = `${newOrderToken}/${newBaseToken}`;
    setMarketPair(concatenatedMarket);
}