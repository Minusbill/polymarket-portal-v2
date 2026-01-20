import {getTestClobClient} from "./getTestClobClient";
import {OrderType, Side, type ClobClient} from "@polymarket/clob-client";
import {TickSize} from "@polymarket/clob-client/dist/types";
import {depositUsdcToSafe, withdrawNativeFromSafe, withdrawUsdcFromSafe} from "./depositAndWithdrawUtil";
import {ethers} from "ethers";


const tokenId = "80753924362286813025723810767987419426133508714823014411280631192015782509451";

const getBestPrice = (orderBook: { bids: { price: string }[]; asks: { price: string }[] }, side: Side): number => {
    if (side === Side.BUY) {
        const bestAsk = orderBook.asks?.[orderBook.asks.length - 1];
        if (!bestAsk) throw new Error('订单簿无卖单，无法获取最优卖一价格');
        return Number(bestAsk.price);
    }
    const bestBid = orderBook.bids?.[orderBook.bids.length - 1];
    if (!bestBid) throw new Error('订单簿无买单，无法获取最优买一价格');
    return Number(bestBid.price);
};


async function testBuy(clobClient: ClobClient) {
    ////// Buy //////

    const orderBook = await clobClient.getOrderBook(tokenId);

    console.log("OrderBook: ", orderBook);

    const price = getBestPrice(orderBook, Side.BUY);

    console.log("buy 下单价格: ", price);


    const orderType = OrderType.FOK;
    const buyOrder = await clobClient.createOrder(
        {
            tokenID: tokenId,
            price,
            side: Side.BUY,
            size: 5,
        },
        {tickSize: orderBook.tick_size as TickSize},
    );
    console.log("Created By Order: ", buyOrder);

    let result = await clobClient.postOrder(buyOrder, orderType);

    console.log("Buy Order Result", result);
}


async function testSell(clobClient: ClobClient) {
    ////// Sell //////
    const orderBook = await clobClient.getOrderBook(tokenId);

    console.log("OrderBook: ", orderBook);

    const price = getBestPrice(orderBook, Side.SELL);

    console.log("sell 下单价格: ", price);


    const orderType = OrderType.FOK;
    const sellOrder = await clobClient.createOrder(
        {
            tokenID: tokenId,
            price,
            side: Side.SELL,
            size: 5,
        },
        {tickSize: orderBook.tick_size as TickSize},
    );
    console.log("Created Order: ", sellOrder);

    let result = await clobClient.postOrder(sellOrder, orderType);

    console.log("Sell Order Result", result);
}


async function test() {
    const actionRaw = process.argv[2];
    if (!actionRaw) {
        throw new Error('请指定 buy 或 sell，例如：npx tsx src/shared/utils/test.ts buy');
    }
    const action = actionRaw.toLowerCase();
    if (action !== 'buy' && action !== 'sell') {
        throw new Error(`参数错误：${actionRaw}，仅支持 buy 或 sell`);
    }
    const {client} = await getTestClobClient();

    if (action === 'sell') {
        await testSell(client);
        return;
    }
    await testBuy(client);
}

async function depositUsdc() {
    const {client, wallet} = await getTestClobClient();
    const provider = new ethers.providers.JsonRpcProvider("https://polygon.drpc.org");
    let owner = new ethers.Wallet(wallet.privateKey, provider);
    await depositUsdcToSafe(owner, wallet.proxyPublicKey || "", 5);
}


async function withdrawNative() {
    const {wallet} = await getTestClobClient();
    const provider = new ethers.providers.JsonRpcProvider("https://polygon.drpc.org");
    let owner = new ethers.Wallet(wallet.privateKey, provider);
    await withdrawNativeFromSafe(owner, wallet.proxyPublicKey || "", owner.address, 4);
}

async function withdrawUsdc() {
    const {wallet} = await getTestClobClient();
    const provider = new ethers.providers.JsonRpcProvider("https://polygon.drpc.org");
    let owner = new ethers.Wallet(wallet.privateKey, provider);
    await withdrawUsdcFromSafe(owner, wallet.proxyPublicKey || "", owner.address, 5.87);
}

//withdrawUsdc();
//withdrawNative();
//depositUsdc();

test();
