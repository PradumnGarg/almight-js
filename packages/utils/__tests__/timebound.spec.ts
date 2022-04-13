import { AsyncCallTimeOut } from "../src/exceptions";
import { asyncCallWithTimeBound } from "../src/functions";

describe("Testing asyncCallWithTimeBound function", () => {

    async function getAsyncMethod() {
        setTimeout(() => {
            ////
        }, 2000);

        return 23;
    }

    test("Testing for async functions, successfull execution", async () => {


        expect(await asyncCallWithTimeBound(getAsyncMethod(), 3000)).toBe(23);
    });

    test("Testing for async functions, failed due to timeout", async () => {
        try {
            await asyncCallWithTimeBound(getAsyncMethod(), 100);
        }catch(e){
            expect(e).toBeInstanceOf(AsyncCallTimeOut);
        }
    });
    test("Testing for regular error in async functions", async() => {
        async function errorProne() {
            await getAsyncMethod();
            throw new Error("random_error")
        }

        try {
            await asyncCallWithTimeBound(errorProne(), 3000);
            fail("Function is not throwing expected error")
        }catch(e){
            expect(e).not.toBeInstanceOf(AsyncCallTimeOut)
            expect(e.message).toBeDefined();
            expect(e.message).toBe("random_error")
        }
    });
})