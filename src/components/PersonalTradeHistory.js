import { FieldSet } from 'nexus-module';

export default function PersonalTradeHistory() {
    return (
        <div className="mt2">
            <FieldSet legend="My Executed Orders">
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Price</th>
                                <th>Amount</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>0.0000001 BTC</td>
                                <td>1000 NXS</td>
                                <td>2021-09-01 12:00:00</td>
                            </tr>
                            <tr>
                                <td>0.0000002 BTC</td>
                                <td>500 NXS</td>
                                <td>2021-09-01 12:05:00</td>
                            </tr>
                            <tr>
                                <td>0.0000003 BTC</td>
                                <td>200 NXS</td>
                                <td>2021-09-01 12:10:00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FieldSet>
        </div>
    );
}