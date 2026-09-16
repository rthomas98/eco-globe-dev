import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesListingCategory } from './listing-category';
test('legacy material groups match discovery categories without matching unrelated titles', () => {
 const oil={title:'Refined Used Cooking Oil (UCO)',category:'Certified Feedstocks',materialTypeCode:'certified_feedstock'};
 assert.equal(matchesListingCategory(oil,'Oils & Liquid Feedstocks'),true);
 assert.equal(matchesListingCategory(oil,'Used products'),false);
 assert.equal(matchesListingCategory({title:'Used Pallets',category:'Used Products',materialTypeCode:'used_product'},'Used products'),true);
 assert.equal(matchesListingCategory({title:'Wood Pellets',category:'Low CO₂ Feedstocks'},'Biomass & Wood'),true);
 assert.equal(matchesListingCategory(oil,'Plastics'),false);
});
