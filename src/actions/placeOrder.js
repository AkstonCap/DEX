import { apiCall } from 'nexus-module';

export const placeOrder = async (orderType, price, amount, fromAccount, toAccount) => {
    const order = {
        price: price,
        amount: amount,
        from: fromAccount,
        to: toAccount,
    };
    const result = await apiCall('market/create/' + {orderType}, order);
    return result;
};