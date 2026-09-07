import { Contact } from '../types';

/**
 * Calcula o custo da rota de ida e volta do técnico para o cliente.
 * Base de cálculo: distância registrada no cadastro do cliente (km) x 2 (ida e volta)
 * multiplicado pelo custo de combustível do técnico (R$/km).
 */
export const calculateTechnicianRouteCost = (
  customer?: Contact | null,
  technician?: Contact | null
) => {
  const distanceOneWay = Number(customer?.address?.distanceKm || 0);
  const roundTripKm = Math.round(distanceOneWay * 2 * 10) / 10; // ida e volta

  // Custo de combustível do técnico:
  // 1. travelCostPerKm (R$/km) se configurado
  // 2. fuelPricePerLiter / carFuelEconomyKmPerLiter se ambos configurados
  // 3. fuelPricePerLiter / 10 como estimativa padrão
  // 4. fallback padrão de 0.67 R$/km (padrão 6.70 / 10)
  let fuelCostPerKm = 0;
  if (technician?.technicianDetails) {
    const tech = technician.technicianDetails;
    if (typeof tech.travelCostPerKm === 'number' && tech.travelCostPerKm > 0) {
      fuelCostPerKm = tech.travelCostPerKm;
    } else if (
      typeof tech.fuelPricePerLiter === 'number' &&
      typeof tech.carFuelEconomyKmPerLiter === 'number' &&
      tech.carFuelEconomyKmPerLiter > 0
    ) {
      fuelCostPerKm = tech.fuelPricePerLiter / tech.carFuelEconomyKmPerLiter;
    } else if (typeof tech.fuelPricePerLiter === 'number' && tech.fuelPricePerLiter > 0) {
      fuelCostPerKm = tech.fuelPricePerLiter / 10;
    }
  }

  if (fuelCostPerKm <= 0) {
    fuelCostPerKm = 0.67;
  }

  const totalRouteCost = Math.round(roundTripKm * fuelCostPerKm * 100) / 100;

  return {
    distanceOneWay,
    roundTripKm,
    fuelCostPerKm,
    totalRouteCost,
  };
};
