function calculateSimpleRevenue(purchase, _product) {
    // Расчёт выручки от операции с учётом скидки
    const discountMultiplier = 1 - (purchase.discount / 100);
    const revenue = purchase.sale_price * purchase.quantity * discountMultiplier;
    return revenue;
}

function calculateBonusByProfit(index, total, seller) {
    // Расчёт бонуса от позиции в рейтинге
    const { profit } = seller;
    
    if (index === 0) {
        // 15% для первого места
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        // 10% для второго и третьего места
        return profit * 0.10;
    } else if (index === total - 1) {
        // 0% для последнего места
        return 0;
    } else {
        // 5% для всех остальных
        return profit * 0.05;
    }
}

function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data 
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы необходимые функции для расчётов');
    }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((result, seller) => {
        result[seller.id] = seller;
        return result;
    }, {});

    const productIndex = data.products.reduce((result, product) => {
        result[product.sku] = product;
        return result;
    }, {});

    // Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            return; // Пропускаем записи с несуществующими продавцами
        }

        // Увеличить количество продаж
        seller.sales_count += 1;
        
        // Увеличить общую сумму всех продаж
        seller.revenue += record.total_amount;

        // Расчёт прибыли для каждого товара в чеке
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) {
                return; // Пропускаем товары, которых нет в каталоге
            }

            // Посчитать себестоимость
            const cost = product.purchase_price * item.quantity;
            
            // Посчитать выручку с учётом скидки
            const revenue = calculateRevenue(item, product);
            
            // Посчитать прибыль
            const itemProfit = revenue - cost;
            
            // Увеличить общую накопленную прибыль у продавца
            seller.profit += itemProfit;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли (по убыванию)
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        // Рассчитать бонус
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // Сформировать топ-10 товаров
        const productsArray = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        seller.top_products = productsArray;
    });

    // Подготовка итоговой коллекции с нужными полями
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
