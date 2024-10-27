
type Fund = {
    id: string;
    image: string;
    name: string;
    totalInvestment: string;
    description: string;
    fundContractId: string;
}

type Investment = {
    id: string;
    image: string;
    name: string;
    amount: string;
    fund: Fund
}