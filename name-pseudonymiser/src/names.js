/*
 * Name lists used to build pseudonyms.
 *
 * Given names are gender-neutral, so a pseudonym never suggests a person's
 * gender. The two lists share no entries, so a pseudonym cannot read as
 * "Morgan Morgan". The tests check both properties.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PseudonymiserNames = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const words = (s) => s.trim().split(/\s+/);

  const FIRST = words(`
    Alex Ali Arden Ari Ash Aubrey August Avery Bailey Bay Billie Blair Blake
    Bobbie Bowie Briar Brook Cameron Carey Casey Charlie Corey Dakota Dale
    Dallas Dana Dani Darcy Devon Drew Eden Elliot Ellis Emerson Emery Finley
    Frankie Gale Gray Greer Hadley Harley Harper Hayden Hollis Indie Indigo
    Jaden Jamie Jay Jesse Jo Jodie Jordan Jules Kai Kelsey Kendall Kerry Kit
    Lane Laurie Lee Lennon Leslie Lindsay Logan Lou Lyric Mackenzie Marley Max
    Mel Micah Milan Morgan Nat Nico Noel Nova Oakley Ollie Parker Pat Peyton
    Phoenix Presley Quinn Rain Ray Reagan Reese Remi Riley Rio River Robin
    Ronnie Rory Rowan Rue Sage Sam Sasha Sawyer Scout Shay Shiloh Sidney Sky
    Sloane Spencer Stevie Sutton Tate Tatum Taylor Teagan Teddy Terry Toni Val
    Wren Wynn Zion
  `);

  const SURNAMES = words(`
    Abbott Ahmed Akhtar Allen Anderson Armstrong Atkinson Austin Bains Baker
    Ball Banks Barker Barnes Barrett Bates Bell Bennett Berry Bird Bishop Booth
    Bradley Brennan Briggs Brooks Brown Bryant Burke Burns Burton Butler Byrne
    Campbell Carr Carroll Carter Chambers Chandler Chapman Chaudhry Chen Clarke
    Coleman Collins Connolly Cook Cooper Cox Craig Cross Cunningham Dalton
    Daniels Davidson Davies Dawson Dean Dixon Doherty Douglas Doyle Duffy
    Duncan Dunn Edwards Evans Farrell Ferguson Fisher Fleming Fletcher Ford
    Foster Fowler Fox Fraser Freeman Fuller Gallagher Gardner Gibson Gill
    Gordon Graham Grant Green Griffiths Hall Hamilton Hammond Hancock Hardy
    Harris Hart Harvey Hawkins Hayes Henderson Hill Hodgson Holland Holmes
    Hopkins Howard Hughes Hunt Hussain Hutchinson Iqbal Jackson Jenkins Johnson
    Johnston Jones Kennedy Khan King Knight Lambert Lawrence Lawson Lewis Lloyd
    Lowe Lynch Macdonald Mahmood Malik Marsh Marshall Martin Mason Matthews
    McCarthy Mills Mitchell Moore Moran Morris Murphy Murray Nash Newman Ng
    Nicholson Nolan Norris Nowak Nwosu O'Brien O'Connor Okafor Osei Owen Palmer
    Parsons Patel Payne Pearce Pearson Phillips Porter Powell Price Rahman Read
    Rees Reid Reynolds Richards Richardson Roberts Robertson Robinson Rogers
    Ross Russell Saunders Scott Shah Sharma Sharp Shaw Simpson Slater Stewart
    Stone Sullivan Sutherland Thompson Thomson Townsend Tucker Turner Wade
    Walker Wallace Walsh Ward Watson Watts Webb Wells Wheeler White Wilkinson
    Williams Willis Wilson Wong Wood Woods Wright Young Yusuf
  `);

  return { FIRST, SURNAMES };
});
