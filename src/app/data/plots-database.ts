/**
 * @deprecated LEGACY DATA FILE
 *
 * This file contains an older Plot interface (string dates, flat array, no
 * reactivity) that pre-dates the current PlotData interface in plots-data.ts.
 * It is still imported in main/AddPlotForm.tsx.
 *
 * Migration path:
 * 1. Identify exactly what AddPlotForm.tsx uses from this file.
 * 2. Move any needed data/helpers into plots-data.ts or a dedicated helper module.
 * 3. Update AddPlotForm.tsx to import from the new location.
 * 4. Delete this file.
 *
 * Do NOT add new code here.
 */
export interface Plot {
  id: string;
  plotName: string;
  owner: string;
  variety: string;
  location: string;
  lastRealTreatment: string;
  crop: string;
  season: string;
}

export const plotsDatabase: Plot[] = [
  {
    id: "1",
    plotName: "cherry 123",
    owner: "demo@resiyou.com",
    variety: "Stella",
    location: "Wuppertal",
    lastRealTreatment: "2024-03-15",
    crop: "Cherry",
    season: "2024"
  },
  {
    id: "2",
    plotName: "Cherry orchard demo UK",
    owner: "aparna.sujitmore.ext@bayer.com",
    variety: "Kordia",
    location: "Loughborough",
    lastRealTreatment: "2024-04-22",
    crop: "Cherry",
    season: "Spring 2025"
  },
  {
    id: "3",
    plotName: "Demo LAB",
    owner: "pablo.orensanz@bayer.com",
    variety: "Sweetheart",
    location: "Bonn",
    lastRealTreatment: "2024-05-10",
    crop: "Cherry",
    season: "2025"
  },
  {
    id: "4",
    plotName: "Mon Cherry",
    owner: "barbara.witkowska@bayer.com",
    variety: "Ambrunes",
    location: "Karlsruhe",
    lastRealTreatment: "2024-06-18",
    crop: "Cherry",
    season: "Summer 2025"
  },
  {
    id: "5",
    plotName: "Nik Ciliegia",
    owner: "agusti.soler@bayer.com",
    variety: "Duroni",
    location: "Terni",
    lastRealTreatment: "2024-07-25",
    crop: "Cherry",
    season: "Default Season"
  },
  {
    id: "6",
    plotName: "Plot id 3",
    owner: "demo@resiyou.com",
    variety: "Arcina",
    location: "Rio de Janeiro",
    lastRealTreatment: "2024-08-30",
    crop: "Cherry",
    season: "2024"
  },
  {
    id: "7",
    plotName: "sweetheart",
    owner: "aparna.sujitmore.ext@bayer.com",
    variety: "Sweetheart",
    location: "Aielo del Friuli",
    lastRealTreatment: "2024-09-14",
    crop: "Cherry",
    season: "Spring 2025"
  },
  {
    id: "8",
    plotName: "Test apple 1",
    owner: "pablo.orensanz@bayer.com",
    variety: "Gala",
    location: "El Robledo",
    lastRealTreatment: "2024-10-05",
    crop: "Apple",
    season: "2025"
  },
  {
    id: "9",
    plotName: "test_cherry_deployment",
    owner: "barbara.witkowska@bayer.com",
    variety: "Schattenmorelle",
    location: "Wuppertal",
    lastRealTreatment: "2024-11-12",
    crop: "Cherry",
    season: "Summer 2025"
  },
  {
    id: "10",
    plotName: "test_plot",
    owner: "agusti.soler@bayer.com",
    variety: "Stella",
    location: "Loughborough",
    lastRealTreatment: "2024-12-20",
    crop: "Cherry",
    season: "Default Season"
  },
  {
    id: "11",
    plotName: "Apple Grove North",
    owner: "demo@resiyou.com",
    variety: "Fuji",
    location: "Bonn",
    lastRealTreatment: "2025-01-08",
    crop: "Apple",
    season: "2024"
  },
  {
    id: "12",
    plotName: "Pear Field 1",
    owner: "aparna.sujitmore.ext@bayer.com",
    variety: "Williams",
    location: "Karlsruhe",
    lastRealTreatment: "2025-02-15",
    crop: "Pear",
    season: "Spring 2025"
  },
  {
    id: "13",
    plotName: "Grape Vineyard A",
    owner: "pablo.orensanz@bayer.com",
    variety: "Chardonnay",
    location: "Terni",
    lastRealTreatment: "2025-03-22",
    crop: "Grape",
    season: "2025"
  },
  {
    id: "14",
    plotName: "Cherry Field East",
    owner: "barbara.witkowska@bayer.com",
    variety: "Kordia",
    location: "Rio de Janeiro",
    lastRealTreatment: "2025-04-10",
    crop: "Cherry",
    season: "Summer 2025"
  },
  {
    id: "15",
    plotName: "Apple Orchard 5",
    owner: "agusti.soler@bayer.com",
    variety: "Granny Smith",
    location: "Aielo del Friuli",
    lastRealTreatment: "2025-05-18",
    crop: "Apple",
    season: "Default Season"
  },
  {
    id: "16",
    plotName: "Pear Block West",
    owner: "demo@resiyou.com",
    variety: "Bartlett",
    location: "El Robledo",
    lastRealTreatment: "2025-06-25",
    crop: "Pear",
    season: "2024"
  },
  {
    id: "17",
    plotName: "Grape Plot South",
    owner: "aparna.sujitmore.ext@bayer.com",
    variety: "Merlot",
    location: "Wuppertal",
    lastRealTreatment: "2025-07-30",
    crop: "Grape",
    season: "Spring 2025"
  },
  {
    id: "18",
    plotName: "Cherry Test Site",
    owner: "pablo.orensanz@bayer.com",
    variety: "Ambrunes",
    location: "Loughborough",
    lastRealTreatment: "2025-08-12",
    crop: "Cherry",
    season: "2025"
  },
  {
    id: "19",
    plotName: "Apple Trial 2",
    owner: "barbara.witkowska@bayer.com",
    variety: "Honeycrisp",
    location: "Bonn",
    lastRealTreatment: "2025-09-05",
    crop: "Apple",
    season: "Summer 2025"
  },
  {
    id: "20",
    plotName: "Pear Orchard Central",
    owner: "agusti.soler@bayer.com",
    variety: "Conference",
    location: "Karlsruhe",
    lastRealTreatment: "2025-10-20",
    crop: "Pear",
    season: "Default Season"
  },
  {
    id: "21",
    plotName: "Grape Field 12",
    owner: "demo@resiyou.com",
    variety: "Cabernet",
    location: "Terni",
    lastRealTreatment: "2025-11-15",
    crop: "Grape",
    season: "2024"
  },
  {
    id: "22",
    plotName: "Cherry Demo Plot",
    owner: "aparna.sujitmore.ext@bayer.com",
    variety: "Duroni",
    location: "Rio de Janeiro",
    lastRealTreatment: "2025-12-08",
    crop: "Cherry",
    season: "Spring 2025"
  },
  {
    id: "23",
    plotName: "Apple Section B",
    owner: "pablo.orensanz@bayer.com",
    variety: "Pink Lady",
    location: "Aielo del Friuli",
    lastRealTreatment: "2026-01-14",
    crop: "Apple",
    season: "2025"
  },
  {
    id: "24",
    plotName: "Pear Unit 7",
    owner: "barbara.witkowska@bayer.com",
    variety: "Bosc",
    location: "El Robledo",
    lastRealTreatment: "2026-02-20",
    crop: "Pear",
    season: "Summer 2025"
  },
  {
    id: "25",
    plotName: "Grape Vineyard C",
    owner: "agusti.soler@bayer.com",
    variety: "Pinot Noir",
    location: "Wuppertal",
    lastRealTreatment: "2026-03-10",
    crop: "Grape",
    season: "Default Season"
  }
];

// Helper functions to get unique values from the database
export function getUniqueSeasons(): string[] {
  const seasons = plotsDatabase.map(plot => plot.season);
  return Array.from(new Set(seasons)).sort();
}

export function getUniqueCrops(): string[] {
  const crops = plotsDatabase.map(plot => plot.crop);
  return Array.from(new Set(crops)).sort();
}

export function filterPlots(
  plots: Plot[],
  filters: {
    season?: string;
    crop?: string;
    search?: string;
  }
): Plot[] {
  return plots.filter(plot => {
    // Season filter
    if (filters.season && filters.season !== 'all' && plot.season !== filters.season) {
      return false;
    }

    // Crop filter
    if (filters.crop && filters.crop !== 'all' && plot.crop !== filters.crop) {
      return false;
    }

    // Search filter (case-insensitive, searches in plot name)
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      if (!plot.plotName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}
