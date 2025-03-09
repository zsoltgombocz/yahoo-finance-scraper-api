import express from 'express';
import cors from 'cors';
import StockRoute from './routes/stocks.js'
import ErrorHandler from './middlewares/error.js';

const app = express();

app.get('/', (_req, res) => {
    return res.json({
        'title': 'Yahoo Scraper API',
        'message': 'Private Yahoo Finance Scraper designed to retrieve data by providing a stock name.'
    });
});

app.use(cors());

app.use('/stocks', StockRoute);

app.use(ErrorHandler);

app.listen(3333, async () => {
    console.log(`[SERVER]: Server started.`);
});