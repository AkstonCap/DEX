# Nexus DEX module

This is a decentralized exchange wallet module for the Nexus Interface built with React and Redux. It includes an overview of the on-chain existing orders and history of executed orders, the ability to create and execute orders, watching charts and market depth statistics, and listing all Nexus tokens with market attributes. Everything on-chain and 100% decentralized.

### How to install module

1. Download and install the [latest version of Nexus Wallet](https://github.com/Nexusoft/NexusInterface/releases/latest) if you haven't.
2. Go to latest verified release of the DEX module (currently v0.2.2 - https://github.com/AkstonCap/DEX/releases/tag/v0.2.2)
3. Download zip folder "dex_module@0.2.2.zip"
4. Go to the Nexus Wallet -> Settings -> Modules
5. Import "dex_module@0.2.2.zip" in the "Add module" box
6. Click "Install module" in pop-up.

### How to install unverified beta- or official releases of this module (not yet verified by Nexus DAO dev team)

1. Download and install the [latest version of Nexus Wallet](https://github.com/Nexusoft/NexusInterface/releases/latest) if you haven't.
2. Download [this module's zip file](https://github.com/AkstonCap/DEX/releases/latest).
3. Unzip the files into your local repository.
4. Open the terminal and redirect to inside the unzipped folder.
5. Run
   "npm install"
   and then
   "npm run build"
7. Open Nexus Wallet, go to Settings/Modules, drag and drop the unzipped folder into the "Add module" section and click "Install module" when prompted (requires that your wallet is in "Developer mode").
8. After the wallet refreshes, an item for this template module will be added into the bottom navigation bar. Click on it to open the module.

### Module overview

In the top right corner of the module you'll see two input fields and a refresh button, these defines and updates the chosen market pair. To update the market pair, insert the global names of the two tokens to trade (for instance DIST and NXS, yielding the market pair DIST/NXS) and click on the refresh button. 
The module currently only works for tokens with a global name.

The module furthermore consists of 5 tabs:

1. Overview

This shows a set of market attributes for the chosen market pair, together with a compressed order book, trade history, the users last trades, and the users active orders.

2. Trading desk

3. Charts and trading history

4. Market depth

5. Markets

Here you'll see overview tables of tokens on Nexus and their market attributes (price, volume, etc) vs NXS. You can also search for specific token names by inputting characters in the search field above the bottom table.

### Module security

The module uses API's from Nexus LLL-TAO, meaning that no transactions or other blockchain functionalities are coded from scratch. All transactions in this module happens through the secureApiCall which is an in-built utility in the nexus global variable in the Nexus Interface (https://github.com/Nexusoft/NexusInterface/blob/master/docs/Modules/module-security.md#secureapicall), with a pre-defined window pop-up and required pin input for execution.
In this way the module inherits similar security as the wallet.

More info on module security can be found here: https://github.com/Nexusoft/NexusInterface/blob/master/docs/Modules/module-security.md
