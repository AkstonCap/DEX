import { FieldSet } from 'nexus-module';
//import { useSelector } from 'react-redux';
import { renderExecutedOrders } from './TradeHistory';

export default function PersonalTradeHistory() {
    //const executedOrders = useSelector((state) => state.ui.market.executedData.executedOrders);

    return (
        <div className="mt2">
            <FieldSet legend="My Transactions">
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Price [{baseToken}/{orderToken}]</th>
                                <th>Amount {orderToken}</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderExecutedOrders()}
                        </tbody>
                    </table>
                </div>
            </FieldSet>
        </div>
    );
}