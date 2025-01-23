# Nexus DEX module

This is a decentralized exchange wallet module for the Nexus Interface built with React and Redux. It will include an overview of the on-chain existing orders and history of executed orders, the ability to create and execute orders, and watching charts and market depth statistics. Everything on-chain and 100% decentralized.

### How to use this module (not yet checked by Nexus DAO dev team)

1. Download and install the [latest version of Nexus Wallet](https://github.com/Nexusoft/NexusInterface/releases/latest) if you haven't.
2. Download [this module's zip file](https://github.com/AkstonCap/DEX/releases/latest).
3. Unzip the files into your local repository.
4. Open the terminal and redirect to inside the unzipped folder.
5. Run <npm install> and <npm run build>.
6. Open Nexus Wallet, go to Settings/Modules, drag and drop the unzipped folder into the "Add module" section and click "Install module" when prompted (requires that your wallet is in "Developer mode").
7. After the wallet refreshes, an item for this template module will be added into the bottom navigation bar. Click on it to open the module.

### Module security

The module uses API's from Nexus LLL-TAO, meaning that no transactions or other blockchain functionalities are coded from scratch. All transactions in this module happens through the secureAPI call which is hardcoded into LLL-TAO, with a pre-defined window pop-up and required pin input for execution.
In this way the module inherits similar security as the wallet.
