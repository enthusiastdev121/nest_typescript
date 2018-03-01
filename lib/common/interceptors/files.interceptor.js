"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
function FilesInterceptor(fieldName, maxCount, options) {
    const Interceptor = class {
        constructor() {
            this.upload = multer(options);
        }
        intercept(request, context, stream$) {
            return __awaiter(this, void 0, void 0, function* () {
                yield new Promise((resolve, reject) => this.upload.array(fieldName, maxCount)(request, request.res, err => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                }));
                return stream$;
            });
        }
    };
    return Interceptor;
}
exports.FilesInterceptor = FilesInterceptor;
