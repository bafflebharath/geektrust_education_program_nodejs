const fs = require("fs");

// Context
class GeekdemyCart {
    constructor() {
        this.programmes = [];
        this.discountStrategy = null;
        this.enrollmentStrategy = null;
        this.proMembershipStrategy = null;
        this.proMembershipFee = 0;
        this.subtotal = 0;
        this.discount = 0;
        this.enrollmentFee = 0;
        this.proMembershipDiscount = 0;
        this.appliedCoupon = null;
    }

    getAppliedCoupon() {
        return this.appliedCoupon;
    }

    setAppliedCoupon(coupon) {
        this.appliedCoupon = coupon;
    }

    setDiscountStrategy(discountStrategy) {
        this.discountStrategy = discountStrategy;
    }

    setEnrollmentStrategy(enrollmentStrategy) {
        this.enrollmentStrategy = enrollmentStrategy;
    }

    setProMembershipStrategy(proMembershipStrategy) {
        this.proMembershipStrategy = proMembershipStrategy;
    }

    addProMembershipFee() {
        this.proMembershipFee = PRO_MEMBERSHIP_FEE;
    }

    getProMembershipFee() {
        return this.proMembershipFee;
    }

    addProgramme(programme) {
        this.programmes.push(programme);
    }

    getProgrammes() {
        return this.programmes;
    }

    calculateSubtotal() {
        this.subtotal = this.programmes.reduce((sum, programme) => sum + programme.getCost(), 0);
        return this.subtotal;
    }

    calculateProMembershipDiscount() {
        if (this.proMembershipFee > 0) {
            this.proMembershipDiscount = this.proMembershipStrategy.calculateDiscount(this.programmes);
        }
        return this.proMembershipDiscount;
    }

    totalDiscountableQuantity() {
        return this.programmes
            .filter(programme => this.isDiscountableProgramme(programme.getType()))
            .reduce((sum, programme) => sum + programme.getQuantity(), 0);
    }

    isDiscountableProgramme(type) {
        return type !== null && ['CERTIFICATION', 'DEGREE', 'DIPLOMA'].includes(type);
    }

    calculateDiscount() {
        if (this.totalDiscountableQuantity() >= MIN_DISCOUNTABLE_QUANTITY) {
            this.discount = this.calculateMinimumDiscountableProgrammeCost();
        } else {
            const beforeDiscount = this.subtotal + this.enrollmentFee + this.proMembershipFee - this.proMembershipDiscount;
            this.discount = this.discountStrategy.calculateDiscount(beforeDiscount);
        }
        return this.discount;
    }

    calculateMinimumDiscountableProgrammeCost() {
        return this.programmes
            .filter(programme => this.isDiscountableProgramme(programme.getType()))
            .reduce((minCost, programme) => Math.min(minCost, programme.getSingleCost()), Infinity);
    }

    calculateEnrollmentFee() {
        this.enrollmentFee = this.enrollmentStrategy.calculateEnrollmentFee(this.subtotal);
        return this.enrollmentFee;
    }

    calculateTotalFare() {
        const totalBeforeDiscount = this.subtotal + this.enrollmentFee + this.proMembershipFee - this.proMembershipDiscount;

        if (this.totalDiscountableQuantity() >= MIN_DISCOUNTABLE_QUANTITY) {
            this.discount = this.calculateMinimumDiscountableProgrammeCost();
        } else {
            this.discount = this.discountStrategy.calculateDiscount(totalBeforeDiscount);
        }

        return totalBeforeDiscount - this.discount;
    }
}

// Strategy Interfaces
class DiscountStrategy {
    calculateDiscount(beforeDiscount) { }
}

class EnrollmentStrategy {
    calculateEnrollmentFee(totalCost) { }
}

class ProMembershipStrategy {
    calculateDiscount(programmes) { }
}

// Concrete Strategies
class B4G1Discount extends DiscountStrategy {
    calculateDiscount(beforeDiscount) {
        return 0;
    }
}

class DealG20Discount extends DiscountStrategy {
    calculateDiscount(beforeDiscount) {
        return (beforeDiscount >= 0) ? beforeDiscount * 0.20 : 0;
    }
}

class DealG5Discount extends DiscountStrategy {
    calculateDiscount(beforeDiscount) {
        return (beforeDiscount >= 0) ? beforeDiscount * 0.05 : 0;
    }
}

class DefaultEnrollmentStrategy extends EnrollmentStrategy {
    calculateEnrollmentFee(totalCost) {
        return totalCost < DEFAULT_ENROLLMENT_FEE_THRESHOLD ? DEFAULT_ENROLLMENT_FEE : 0;
    }
}

class ProMembershipDiscount extends ProMembershipStrategy {
    calculateDiscount(programmes) {
        return programmes.reduce((sum, programme) => sum + programme.getDiscountRate() * programme.getCost(), 0);
    }
}

// Programme Class
const ProgrammeType = {
    CERTIFICATION: 'CERTIFICATION',
    DEGREE: 'DEGREE',
    DIPLOMA: 'DIPLOMA'
};

class Programme {
    constructor(type, quantity) {
        this.type = type;
        this.quantity = quantity;
    }

    getType() {
        return this.type;
    }

    getQuantity() {
        return this.quantity;
    }

    getSingleCost() {
        switch (this.type) {
            case ProgrammeType.CERTIFICATION:
                return 3000;
            case ProgrammeType.DEGREE:
                return 5000;
            case ProgrammeType.DIPLOMA:
                return 2500;
            default:
                return 0;
        }
    }

    getCost() {
        return this.getSingleCost() * this.quantity;
    }

    getDiscountRate() {
        switch (this.type) {
            case ProgrammeType.CERTIFICATION:
                return 0.02;
            case ProgrammeType.DEGREE:
                return 0.03;
            case ProgrammeType.DIPLOMA:
                return 0.01;
            default:
                return 0;
        }
    }
}

// Constants
const PRO_MEMBERSHIP_FEE = 200;
const MIN_DISCOUNTABLE_QUANTITY = 4;
const DEFAULT_ENROLLMENT_FEE_THRESHOLD = 6666.0;
const DEFAULT_ENROLLMENT_FEE = 500;

// Main
const main = (filename) => {
    const cart = new GeekdemyCart();
    cart.setDiscountStrategy(new B4G1Discount()); // Default discount strategy
    cart.setEnrollmentStrategy(new DefaultEnrollmentStrategy()); // Default enrollment strategy
    cart.setProMembershipStrategy(new ProMembershipDiscount()); // Default pro membership strategy

    fs.readFile(filename, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading the input file:", err.message);
            process.exit(1);
        }

        const lines = data.toString().split("\n");
        const cleanLines = lines.map(line => line.replace(/\r/g, ''));
        cleanLines.forEach(cleanLine => processCommand(cart, cleanLine));

        printBill(cart);
    });
};

const processCommand = (cart, command) => {
    if (typeof command === 'string') {
        const tokens = command.split(' ');
        switch (tokens[0]) {
            case "ADD_PROGRAMME":
                addProgramme(cart, tokens);
                break;
            case "PRO_MEMBERSHIP":
                applyProMembershipCoupon(cart);
                break;
            case "APPLY_COUPON":
                applyCoupon(cart, tokens);
                break;
            case "PRINT_BILL":
                // Additional processing if needed before printing the bill
                break;
            default:
                break;
        }
    }else{
        console.error('Invalid command - Not a string:', command);
    }

};

const addProgramme = (cart, tokens) => {
    if (tokens.length === 3) {
        const programmeType = ProgrammeType[tokens[1]];
        const quantity = parseInt(tokens[2]);
        count += quantity;
        cart.addProgramme(new Programme(programmeType, quantity));
    }
};

const applyCoupon = (cart, tokens) => {
    if (cart.getAppliedCoupon() === null && count >= MIN_DISCOUNTABLE_QUANTITY && tokens.length === 2) {
        cart.setAppliedCoupon("B4G1");
    } else if (cart.getAppliedCoupon() === null) {
        const coupon = tokens[1];
        applyOtherCoupon(cart, coupon);
    }
};

const applyOtherCoupon = (cart, coupon) => {
    const discountStrategies = {
        "deal_g20": new DealG20Discount(),
        "deal_g5": new DealG5Discount()
    };

    const discountStrategy = discountStrategies[coupon.toLowerCase()];
    if (discountStrategy) {
        cart.setDiscountStrategy(discountStrategy);
        cart.setAppliedCoupon(coupon.toUpperCase());
    }
};

const applyProMembershipCoupon = (cart) => {
    cart.calculateProMembershipDiscount();
    cart.setProMembershipStrategy(new ProMembershipDiscount());
    cart.addProMembershipFee(); // Add the Pro Membership fee
};

const printBill = (cart) => {
    console.log(`SUB_TOTAL  ${cart.calculateSubtotal().toFixed(2)}`);
    console.log(`TOTAL_PRO_DISCOUNT   ${cart.calculateProMembershipDiscount().toFixed(2)}`);
    console.log(`PRO_MEMBERSHIP_FEE   ${cart.getProMembershipFee().toFixed(2)}`);
    console.log(`ENROLLMENT_FEE   ${cart.calculateEnrollmentFee().toFixed(2)}`);
    console.log(`COUPON_DISCOUNT   ${cart.getAppliedCoupon()}    ${cart.calculateDiscount(cart.getProgrammes()).toFixed(2)}`);
    console.log(`TOTAL   ${cart.calculateTotalFare().toFixed(2)}`);
};

// Counter
let count = 0;

// Run the main function with the provided input file path
const filename = process.argv[2];
main(filename);