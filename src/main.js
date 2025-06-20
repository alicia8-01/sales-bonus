/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет прибыли от операции
   const discount = 1 - (purchase.discount / 100);
   
   return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    if (index === 0) {
        return +(seller.profit * 0.15).toFixed(2);
    } else if (index === 1 || index === 2) {
        return +(seller.profit * 0.10).toFixed(2);
    } else if (index === total - 1) {
        return 0;
    } else {
        return +(seller.profit * 0.05).toFixed(2);
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data || 
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error("Неверные или пустые входные данные");
    }

    // @TODO: Проверка наличия опций
    if (typeof options !== "object") {
        throw new Error("Опции должны быть объектом");
    }
    
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error("В опциях отсутствуют необходимые функции");
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );
    
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        
        const receiptRevenue = record.total_amount - record.total_discount;
        seller.revenue += receiptRevenue;

        let totalItemsRevenue = 0;
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            
            const itemRevenue = calculateSimpleRevenue(item, product);
            totalItemsRevenue += itemRevenue;
            
            const profit = itemRevenue - cost;
            
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });

        if (record.total_amount > 0) {
            const adjustmentFactor = receiptRevenue / record.total_amount;
            seller.revenue += totalItemsRevenue * (1 - adjustmentFactor);
        }
    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    const totalSellers = sellerStats.length;
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, totalSellers, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}