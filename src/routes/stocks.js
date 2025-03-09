import { Router } from "express";
import isStockExists from "../scraper/exists.js";
import scrapeStockData from "../scraper/data.js";

const router = Router();

router.get('/:stock', async (request, response, next) => {
    try {
        const stockExists = await isStockExists(request.params.stock);

        if (! stockExists) {
            return response.status(404).json({ message: 'Stock not found.' });
        }

        const stockData = await scrapeStockData(request.params.stock);

        return response.json(stockData);
    } catch (err) {
        next(err);
    }
});

export default router;
