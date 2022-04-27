import Market from '../castrum/Market';

const INTERESTED_RESOURCES = [
    // RESOURCE_ENERGY,
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN,
    RESOURCE_UTRIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_KEANIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_CATALYST
]

export default class Logistician {
    _markets: Market[];      //all dominion markets
    _marketsTick: number;    //last tick markets were refreshed

    basicResources: ResourceConstant[]

    constructor() {
        this._markets = [];
        this._marketsTick = 0;

        this.basicResources = INTERESTED_RESOURCES;
        this.clean();
    }
    
    /**
     * Method to supply requested resources to a room, either via another room's surplus or through purchase
     * @param roomMarket 
     * @param resource 
     * @param amountRequested 
     * @returns 
     */
    requistion(roomMarket: Market, resource: ResourceConstant, amountRequested: number): ScreepsReturnCode {
        //first see if any other rooms have the resource we need and then find the best candidate
        let currentBest: Market | undefined;
        let currentBestAmount = 0;
        for (let market of this.markets) {
            if (market.id === roomMarket.id) continue;
            let netOrders = this.getNetOrders(market.room);
            let netOrder = netOrders[resource] || 0;
            let amount = market.store.getUsedCapacity(resource) - this.getTarget(resource) + netOrder;
            if (amount > (amountRequested / 2)) {
                if (amount - this.getTarget(resource) > currentBestAmount) {
                    currentBestAmount = amount;
                    currentBest = market;
                }
            }
        }

        //if we have a candidate
        if (currentBest !== undefined) {
            return currentBest.liveObj.send(resource, currentBestAmount, roomMarket.room);
        } 
        return this.purchase(roomMarket.room, resource, amountRequested);
    }

    /**
     * Method to purchase a resource from the market
     * @param room 
     * @param resource 
     * @param amountRequested 
     */
    purchase(room:string, resource: ResourceConstant, amountRequested: number): ScreepsReturnCode {
        //first get energy data for transfer costs
        let energyData = this.getTwoWeekAverages(RESOURCE_ENERGY);
        let energyPrice = energyData.avgPrice;

        //now get price history for the resource we are interested in
        let marketInfo = this.getTwoWeekAverages(resource);
        let sellOrders = Game.market.getAllOrders({type: ORDER_SELL, resourceType: resource});
        let targetPrice = parseFloat((marketInfo["avgPrice"] * 1.15).toFixed(3)); //maybe include marketInfo["stddevPrice"]

        //sort the orders by price, taking into account the energy transfer cost
        let sortedOrders = [];
        for (let order of sellOrders) {
            if (order.roomName === undefined) continue;
            //include energy transfer cost in price
            let totalPrice = (amountRequested * order.price) + (energyPrice * Game.market.calcTransactionCost(amountRequested, room, order.roomName));
            let totalPricePerUnit = totalPrice / amountRequested;

            sortedOrders.push({
                "id": order.id,
                "price": totalPricePerUnit,
                "amount": order.amount,
                "room": order.roomName
            })
        }
        sortedOrders.sort((a, b) => a.price - b.price);
        if (sortedOrders.length > 0 && sortedOrders[0].price < targetPrice) {
            //if the immediate buy is cheaper than the making a buy order, do it
            let amount = Math.min(sortedOrders[0].amount, amountRequested);
            return Game.market.deal(sortedOrders[0].id, amount, room);
        } else {
            //sell orders aren't cheap enough, create a buy order
            return Game.market.createOrder({
                type: ORDER_BUY,
                resourceType: resource,
                price: targetPrice,
                totalAmount: amountRequested,
                roomName: room   
            });
        }
    }

    /**
     * Method to list a resource on the market
     * @param room 
     * @param resourceToSell 
     * @param amountToSell 
     */
    sell(room: string, resourceToSell: ResourceConstant, amountToSell: number): ScreepsReturnCode {
        //TODO: maybe sell to buy orders
        let marketInfo = this.getTwoWeekAverages(resourceToSell);
        let price = parseFloat((marketInfo["avgPrice"] * 0.85).toFixed(3));
        return Game.market.createOrder({
            type: ORDER_SELL,
            resourceType: resourceToSell,
            price: price,
            totalAmount: amountToSell,
            roomName: room   
        });
    }

    /**
     * Method that clears old outdated buy and sell order
     * @param {String} room 
     */
    clean(delAll = false) {
        let allOrders = Game.market.orders;
        for (let id in allOrders) {
            let order = allOrders[id];
            //cancel any orders with no more left to sell or that are too old
            if (delAll || order.amount == 0 || Game.time - order.created > 50000) {
                Game.market.cancelOrder(order.id);
            }
        }
    }

    /**
     * Method to figure out how much net resources a room has in the market
     * @param room 
     * @returns 
     */
    getNetOrders(room: string): {[res in MarketResourceConstant]?: number} {
        let results: {[res in MarketResourceConstant]?: number} = {};
        let allOrders = Game.market.orders;
        for (let id in allOrders) {
            let order = allOrders[id];
            if (order.roomName === room) {
                if (results[order.resourceType] === undefined) {
                    results[order.resourceType] = 0;
                }
                if (order.type === ORDER_BUY) {
                    results[order.resourceType]! += order.amount;
                } else {
                    results[order.resourceType]! -= order.amount;
                }
            }
        }
        return results;
    }

    /**
     * Method to get standard deviation and average price of a resource over the last two weeks
     * @param resource 
     * @returns 
     */
    getTwoWeekAverages(resource: ResourceConstant): {avgPrice: number, stddevPrice: number} {
        let fourteenDays = Game.market.getHistory(resource);

        let averages = [];
        let stddev = [];
        //loop through the last 14 days
        for (let day of fourteenDays) {
            averages.push(day.avgPrice);
            stddev.push(day.stddevPrice);
        }

        //remove outliers
        let resultArray = [];
        for (let array of [averages, stddev]) {
            //sort the array highest to lowest
            array.sort( function(a, b) {
                return a - b;
            });
            //calculate the 1st quarter
            let q1 = array[Math.floor(array.length / 4)];
            //calculate the 3rd quarter
            let q3 = array[Math.floor(array.length * (3/4))];
            let iqr = q3-q1;

            let minValue = q1 - iqr * 1.5;
            let maxValue = q3 + iqr * 1.5;

            resultArray.push(array.filter(x =>
                (x <= maxValue) && (x >= minValue)
            ));
        }
        let sevenDays = {
            "avgPrice": resultArray[0].reduce((a, b) => a + b, 0) / resultArray[0].length,
            "stddevPrice": resultArray[1].reduce((a, b) => a + b, 0) / resultArray[1].length
        }
        return sevenDays;
    }

    /**
     * Method that returns the number of each mineral we should aim to have stored
     * @param {String} resource
     * @returns Target number of resource in the terminal
     */
    getTarget(resource: ResourceConstant) {
        switch (resource) {
            case RESOURCE_ENERGY:
                return 50000;
            default:
                return 10000;
        }
    }

    get markets(): Market[] {
        if (this._marketsTick === Game.time) return this._markets;
        let markets: Market[] = [];
        for (let room of global.Imperator.dominion) {
            let supervisor = global.Imperator.administrators[room].supervisor;
            if (supervisor.castrum[CASTRUM_TYPES.MARKET].length > 0) {
                markets.push(supervisor.castrum[CASTRUM_TYPES.MARKET][0]);
            }
        }
        this._marketsTick = Game.time;
        this._markets = markets;
        return markets;
    }
}
