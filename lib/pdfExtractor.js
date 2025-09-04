"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractProductsFromPdf = extractProductsFromPdf;
exports.extractIkeaProducts = extractIkeaProducts;
var pdfjs = require("pdfjs-dist");
// Définir le chemin du worker pour pdfjs
if (typeof window !== 'undefined' && 'Worker' in window) {
    pdfjs.GlobalWorkerOptions.workerSrc = "//cdnjs.cloudflare.com/ajax/libs/pdf.js/".concat(pdfjs.version, "/pdf.worker.min.js");
}
/**
 * Extrait les données de produits à partir d'un fichier PDF
 * @param file Le fichier PDF à analyser
 * @returns Une promesse qui résout avec un tableau de produits extraits
 */
function extractProductsFromPdf(file) {
    return __awaiter(this, void 0, void 0, function () {
        var arrayBuffer, loadingTask, pdf, extractedText, products, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, file.arrayBuffer()];
                case 1:
                    arrayBuffer = _a.sent();
                    loadingTask = pdfjs.getDocument(arrayBuffer);
                    return [4 /*yield*/, loadingTask.promise];
                case 2:
                    pdf = _a.sent();
                    return [4 /*yield*/, extractTextFromPdf(pdf)];
                case 3:
                    extractedText = _a.sent();
                    products = parseProductsFromText(extractedText);
                    return [2 /*return*/, products];
                case 4:
                    error_1 = _a.sent();
                    console.error('Erreur lors de l\'extraction des données du PDF:', error_1);
                    throw new Error('Impossible d\'extraire les données du PDF');
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Extrait le texte de toutes les pages d'un document PDF
 */
function extractTextFromPdf(pdf) {
    return __awaiter(this, void 0, void 0, function () {
        var fullText, i, page, textContent, pageText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fullText = '';
                    i = 1;
                    _a.label = 1;
                case 1:
                    if (!(i <= pdf.numPages)) return [3 /*break*/, 5];
                    return [4 /*yield*/, pdf.getPage(i)];
                case 2:
                    page = _a.sent();
                    return [4 /*yield*/, page.getTextContent()];
                case 3:
                    textContent = _a.sent();
                    pageText = textContent.items
                        .map(function (item) { return item.str; })
                        .join(' ');
                    fullText += pageText + '\n';
                    _a.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, fullText];
            }
        });
    });
}
/**
 * Analyse le texte extrait pour identifier les produits
 * Adapté spécifiquement au format de facture IKEA
 */
function parseProductsFromText(text) {
    var products = [];
    // Recherche des lignes de produits avec une expression régulière
    // Format attendu: référence, nom, quantité, prix HT, TVA, prix TTC
    var productRegex = /(\d+\.\d+\.\d+)\s+([\w\s]+?)\s+(\d+)\s+(\d+[,.]\d+)\s+(\d+\s*%)\s+(\d+[,.]\d+)/g;
    var match;
    while ((match = productRegex.exec(text)) !== null) {
        var reference = match[1], name_1 = match[2], quantity = match[3], priceHT = match[4], tvaStr = match[5], priceTTC = match[6];
        // Convertir les valeurs en nombres
        var quantityNum = parseInt(quantity, 10);
        var priceHTNum = parseFloat(priceHT.replace(',', '.'));
        var priceTTCNum = parseFloat(priceTTC.replace(',', '.'));
        var tvaNum = parseInt(tvaStr.replace('%', '').trim(), 10);
        products.push({
            reference: reference.trim(),
            name: name_1.trim(),
            quantity: quantityNum,
            priceHT: priceHTNum,
            priceTTC: priceTTCNum,
            tva: tvaNum
        });
    }
    return products;
}
/**
 * Fonction spécifique pour le format de facture IKEA
 * Extrait les produits d'une facture IKEA
 */
function extractIkeaProducts(file) {
    return __awaiter(this, void 0, void 0, function () {
        var arrayBuffer, loadingTask, pdf, extractedText, products, ikeaRegex, match, reference, name_2, quantity, priceHT, tvaStr, priceTTC, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, file.arrayBuffer()];
                case 1:
                    arrayBuffer = _a.sent();
                    loadingTask = pdfjs.getDocument(arrayBuffer);
                    return [4 /*yield*/, loadingTask.promise];
                case 2:
                    pdf = _a.sent();
                    return [4 /*yield*/, extractTextFromPdf(pdf)];
                case 3:
                    extractedText = _a.sent();
                    products = [];
                    ikeaRegex = /(\d{3}\.\d{3}\.\d{2})\s+([\w\s\/.]+?)\s+(\d+)\s+(\d+[,.]\d{2})\s+(\d+\s*%)\s+(\d+[,.]\d{2})/g;
                    match = void 0;
                    while ((match = ikeaRegex.exec(extractedText)) !== null) {
                        reference = match[1], name_2 = match[2], quantity = match[3], priceHT = match[4], tvaStr = match[5], priceTTC = match[6];
                        products.push({
                            reference: reference.trim(),
                            name: name_2.trim(),
                            quantity: parseInt(quantity, 10),
                            priceHT: parseFloat(priceHT.replace(',', '.')),
                            priceTTC: parseFloat(priceTTC.replace(',', '.')),
                            tva: parseInt(tvaStr.replace('%', '').trim(), 10)
                        });
                    }
                    return [2 /*return*/, products];
                case 4:
                    error_2 = _a.sent();
                    console.error('Erreur lors de l\'extraction des produits IKEA:', error_2);
                    throw new Error('Impossible d\'extraire les produits de la facture IKEA');
                case 5: return [2 /*return*/];
            }
        });
    });
}
