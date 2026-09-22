"""
High-Contrast Scientific Earth & Bathymetry Texture Generator (4096x2048)
Creates strong, unmistakable differentiation between:
1. Deep Abyssal Oceans (Deep midnight indigo/navy)
2. Continental Shelf Seas (Luminous cyan-turquoise shallow bathymetry)
3. Continental Landmasses (Rich topographic dark slate/charcoal/forest)
4. Mountain Relief (Himalayas, Western Ghats, Eastern Ghats with elevation shading)
5. Arid/Desert zones (Warm umber/bronze for Thar, Arabia, Sahara)
6. Ultra-crisp, glowing cartographic coastlines
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "earth_dark.png")

W = 4096
H = 2048

def lon_to_x(lon):
    return int(((lon + 180.0) / 360.0) * W)

def lat_to_y(lat):
    return int(((90.0 - lat) / 180.0) * H)

def generate_texture():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. BASE DEEP OCEAN BATHYMETRY
    # Deep abyssal plain: Rich, deep ocean navy/indigo with latitudinal variation
    img = Image.new("RGBA", (W, H), (3, 8, 22, 255))
    draw = ImageDraw.Draw(img)

    for y in range(H):
        lat = 90.0 - (y / H) * 180.0
        depth_cos = math.cos(math.radians(lat))
        # Deep oceanic trench to mid-latitude ocean
        r = int(2 + 3 * depth_cos)
        g = int(6 + 8 * depth_cos)
        b = int(18 + 16 * depth_cos)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # Graticule Lines (Subtle cartographic coordinates)
    graticule_color = (25, 55, 95, 60)
    for lon in range(-180, 181, 15):
        x = lon_to_x(lon)
        draw.line([(x, 0), (x, H)], fill=graticule_color, width=1)
    for lat in range(-80, 81, 10):
        y = lat_to_y(lat)
        draw.line([(0, y), (W, y)], fill=graticule_color, width=1)

    # Equator & Tropics with subtle cyan glow
    draw.line([(0, lat_to_y(0)), (W, lat_to_y(0))], fill=(0, 242, 254, 70), width=2)
    draw.line([(0, lat_to_y(23.5)), (W, lat_to_y(23.5))], fill=(56, 189, 248, 45), width=1)
    draw.line([(0, lat_to_y(-23.5)), (W, lat_to_y(-23.5))], fill=(56, 189, 248, 45), width=1)

    # 2. CONTINENTAL SHELF BATHYMETRY LAYER (Shallow coastal shelf waters)
    # Renders the shallow sea (0-200m depth) surrounding landmasses with turquoise/cyan luminescence
    shelf_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shelf_draw = ImageDraw.Draw(shelf_layer)

    # 3. LANDMASS LAYER
    land_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    land_draw = ImageDraw.Draw(land_layer)

    # Color Palette: Strong contrast with dark ocean
    # Land base: Rich dark slate-charcoal with slight earthy/olive undertone
    COLOR_LAND_PLAINS = (22, 34, 30, 255)       # Rich lowland coastal plains
    COLOR_LAND_PLATEAU = (32, 42, 40, 255)      # Deccan Plateau / elevated interior
    COLOR_DESERT = (42, 36, 26, 255)            # Thar Desert, Arabia, Sahara
    COLOR_MOUNTAINS = (55, 68, 78, 255)         # Western Ghats, Himalayas foothills
    COLOR_PEAKS = (95, 115, 130, 255)           # High Himalayan peaks
    COLOR_COAST_CRISP = (0, 242, 254, 255)      # High-contrast glowing cyan coastline
    COLOR_COAST_OUTER = (8, 90, 140, 160)       # Coastal surf buffer
    COLOR_SHELF_SHALLOW = (14, 82, 128, 180)    # Continental shelf shallow bathymetry

    def draw_polygon_set(coords, fill_color, outline_color=None, width=1, is_land=True):
        pts = [(lon_to_x(lon), lat_to_y(lat)) for lon, lat in coords]
        if len(pts) >= 3:
            if is_land:
                # Add outer shelf buffer around land
                shelf_draw.polygon(pts, fill=COLOR_SHELF_SHALLOW, outline=(18, 110, 165, 220))
                land_draw.polygon(pts, fill=fill_color, outline=outline_color)
            else:
                land_draw.polygon(pts, fill=fill_color, outline=outline_color)

    # --- DETAILED LANDMASS POLYGONS ---

    # 1. INDIAN SUBCONTINENT (High Precision with Peninsular Coastline)
    india_coast = [
        (68.5, 24.5), # Rann of Kutch
        (69.0, 23.2), # Gulf of Kutch North
        (70.1, 22.8), # Saurashtra
        (71.2, 20.8), # Diu / South Saurashtra
        (72.2, 21.0), # Gulf of Khambhat West
        (72.8, 21.7), # Khambhat Head
        (72.9, 21.1), # Surat
        (72.8, 19.1), # Mumbai
        (73.2, 18.0), # Alibaug / Murud
        (73.4, 16.9), # Ratnagiri
        (73.8, 15.5), # Goa (Mormugao)
        (74.3, 14.8), # Karwar
        (74.7, 13.3), # Mangalore
        (75.3, 11.9), # Kannur
        (75.8, 11.2), # Calicut (Kozhikode)
        (76.2, 9.9),  # Kochi
        (76.5, 9.0),  # Kollam
        (77.0, 8.5),  # Thiruvananthapuram
        (77.5, 8.08), # Cape Comorin (Kanyakumari)
        (77.8, 8.4),  # Tirunelveli Coast
        (78.2, 8.8),  # Tuticorin
        (79.0, 9.3),  # Gulf of Mannar
        (79.3, 9.3),  # Rameswaram
        (79.0, 9.8),  # Palk Bay
        (79.9, 10.3), # Point Calimere
        (79.8, 10.8), # Nagapattinam
        (79.8, 11.9), # Puducherry
        (80.3, 13.1), # Chennai
        (80.2, 14.0), # Pulicat Lake
        (80.1, 15.0), # Ongole
        (80.8, 15.8), # Machilipatnam / Krishna Delta
        (82.0, 16.5), # Godavari Delta / Kakinada
        (83.3, 17.7), # Visakhapatnam
        (84.0, 18.4), # Srikakulam
        (85.0, 19.3), # Chilika Lake / Gopalpur
        (85.8, 19.8), # Puri
        (86.7, 20.3), # Paradip / Mahanadi Delta
        (87.1, 21.0), # Dhamra
        (87.5, 21.6), # Balasore
        (87.9, 21.7), # Digha
        (88.3, 22.0), # Hooghly River Mouth / Sagar Island
        (89.0, 21.8), # Sundarbans Indian Sector
        (89.8, 21.9), # Sundarbans Bangladesh Sector
        (90.5, 22.2), # Meghna River Estuary
        (91.8, 22.3), # Chittagong Coast
        (92.3, 21.4), # Cox's Bazar
        (92.8, 20.7), # Teknaf / St. Martin
        (92.9, 20.1), # Sittwe (Myanmar Rakhine)
        (93.8, 18.8), # Kyaukpyu / Ramree Island
        (94.3, 17.5), # Gwa
        (95.2, 16.0), # Cape Negrais
        (96.0, 15.7), # Irrawaddy Delta Mouth
        (96.8, 16.5), # Gulf of Martaban / Yangon
        (97.6, 16.5), # Mawlamyine
        (98.2, 14.1), # Dawei (Tenasserim)
        (98.6, 12.4), # Myeik
        (98.6, 9.8),  # Kawthaung (Kra Isthmus)
        (98.3, 8.0),  # Phuket
        (99.8, 6.3),  # Langkawi / Kedah
        (100.3, 5.4), # Penang
        (101.4, 3.0), # Port Klang
        (103.8, 1.3), # Singapore Strait
        (104.2, 2.0), # Mersing (East Coast Malaya)
        (103.3, 3.8), # Kuantan
        (102.2, 6.2), # Kota Bharu
        (101.0, 7.0), # Gulf of Thailand
        (100.5, 13.5),# Bangkok Bight
        (102.5, 12.0),# Trat
        (104.0, 10.5),# Sihanoukville (Cambodia)
        (105.0, 8.6), # Cape Ca Mau (Mekong Delta Tip)
        (106.7, 10.3),# Ho Chi Minh City / Mekong River
        (109.2, 12.2),# Nha Trang
        (108.8, 15.2),# Da Nang
        (106.5, 17.5),# Dong Hoi
        (106.0, 20.8),# Haiphong / Gulf of Tonkin
        (108.5, 21.5),# China border
        (110.0, 21.0),# Leizhou Peninsula
        (113.5, 22.2),# Macau / Pearl River Delta
        (114.2, 22.3),# Hong Kong
        (117.0, 23.5),# Shantou
        (118.1, 24.5),# Xiamen
        (120.0, 27.0),# Wenzhou
        (121.5, 29.8),# Ningbo
        (121.5, 31.2),# Shanghai / Yangtze Delta
        (120.5, 34.0),# Jiangsu Coast
        (120.5, 37.5),# Shandong Peninsula
        (117.5, 38.5),# Tianjin / Bohai Bay
        (121.5, 39.0),# Dalian
        (124.0, 40.0),# Yalu River
        (115.0, 42.0),# Northern China
        (100.0, 42.0),# Inner Mongolia
        (90.0, 36.0), # Tibetan Plateau North
        (80.0, 35.0), # Karakoram / Ladakh
        (74.5, 36.5), # Gilgit / Hindukush
        (72.0, 34.0), # Peshawar / Khyber
        (70.0, 30.0), # Sulaiman Range
        (67.0, 25.0), # Karachi
        (66.5, 24.8), # Indus Delta Mouth
        (68.5, 24.5)  # Close Loop at Kutch
    ]
    draw_polygon_set(india_coast, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    # 2. DECCAN PLATEAU & INLAND ELEVATION (Distinct geological interior)
    deccan = [
        (74.0, 21.0), (76.5, 21.5), (79.0, 21.0), (80.5, 18.5), (79.5, 15.5),
        (78.5, 13.5), (77.0, 12.0), (76.0, 14.0), (74.5, 17.0), (74.0, 21.0)
    ]
    draw_polygon_set(deccan, COLOR_LAND_PLATEAU, is_land=False)

    # 3. WESTERN GHATS RIDGE (Emerald/granite mountain backbone along west coast)
    w_ghats = [
        (73.5, 20.5), (73.8, 18.5), (74.2, 16.0), (75.0, 14.0), (75.8, 12.0),
        (76.8, 10.5), (77.3, 8.8), (77.0, 8.8), (76.2, 10.2), (75.2, 12.0),
        (74.5, 14.5), (73.8, 17.0), (73.2, 19.0), (73.5, 20.5)
    ]
    draw_polygon_set(w_ghats, COLOR_MOUNTAINS, is_land=False)

    # 4. HIMALAYAS & TIBETAN PLATEAU (Frosted massive mountain barrier)
    himalayas_lower = [
        (74.0, 34.5), (77.0, 32.0), (81.0, 29.5), (85.0, 27.8), (89.0, 27.2),
        (93.0, 27.5), (96.0, 28.5), (95.0, 30.5), (90.0, 31.0), (84.0, 32.5),
        (78.0, 34.5), (74.0, 34.5)
    ]
    draw_polygon_set(himalayas_lower, COLOR_MOUNTAINS, is_land=False)

    himalayas_peaks = [
        (76.0, 33.0), (79.0, 31.0), (83.0, 29.0), (87.0, 28.0), (91.0, 28.2),
        (89.0, 29.2), (85.0, 29.8), (81.0, 31.8), (76.0, 33.0)
    ]
    draw_polygon_set(himalayas_peaks, COLOR_PEAKS, is_land=False)

    # 5. THAR DESERT & ARABIAN COAST (Warm bronze arid tones)
    thar_desert = [
        (69.5, 28.0), (72.5, 29.0), (74.0, 27.0), (72.0, 25.0), (69.5, 26.0), (69.5, 28.0)
    ]
    draw_polygon_set(thar_desert, COLOR_DESERT, is_land=False)

    # 6. SRI LANKA (Detailed tear-drop island with central highlands)
    sri_lanka = [
        (79.7, 9.5), (80.2, 9.8), (80.8, 9.3), (81.3, 8.6), (81.8, 7.3),
        (81.7, 6.4), (81.0, 5.9), (80.4, 5.9), (79.8, 6.9), (79.7, 8.0), (79.7, 9.5)
    ]
    draw_polygon_set(sri_lanka, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)
    sri_lanka_highlands = [(80.5, 7.2), (80.9, 7.2), (80.8, 6.7), (80.4, 6.7)]
    draw_polygon_set(sri_lanka_highlands, COLOR_MOUNTAINS, is_land=False)

    # 7. ANDAMAN AND NICOBAR ARCHIPELAGO
    andaman_north = [(92.8, 13.6), (93.1, 13.5), (93.0, 12.8), (92.7, 12.9)]
    andaman_middle = [(92.7, 12.8), (93.0, 12.7), (92.9, 11.9), (92.6, 12.0)]
    andaman_south = [(92.6, 11.9), (92.8, 11.8), (92.7, 11.4), (92.5, 11.5)]
    nicobar_car = [(92.7, 9.2), (92.9, 9.2), (92.8, 9.0), (92.6, 9.0)]
    nicobar_great = [(93.7, 7.2), (94.0, 7.1), (93.9, 6.8), (93.6, 6.9)]
    for island in [andaman_north, andaman_middle, andaman_south, nicobar_car, nicobar_great]:
        draw_polygon_set(island, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    # 8. LAKSHADWEEP & MALDIVES ATOLLS (Luminous coral atoll reefs)
    for atoll_lat in [11.8, 10.5, 10.1, 8.3]: # Lakshadweep (Chetlat, Kavaratti, Kalpeni, Minicoy)
        ax = lon_to_x(72.6 + (atoll_lat - 10.0) * 0.1)
        ay = lat_to_y(atoll_lat)
        shelf_draw.ellipse([(ax-8, ay-8), (ax+8, ay+8)], fill=COLOR_SHELF_SHALLOW)
        land_draw.ellipse([(ax-3, ay-3), (ax+3, ay+3)], fill=COLOR_LAND_PLAINS, outline=COLOR_COAST_CRISP)

    for m_lat in [7.1, 5.8, 4.2, 3.1, 1.9, 0.6, -0.6]: # Maldives Atolls
        mx = lon_to_x(73.2)
        my = lat_to_y(m_lat)
        shelf_draw.ellipse([(mx-9, my-9), (mx+9, my+9)], fill=COLOR_SHELF_SHALLOW)
        land_draw.ellipse([(mx-3, my-3), (mx+3, my+3)], fill=COLOR_LAND_PLAINS, outline=COLOR_COAST_CRISP)

    # 9. ARABIAN PENINSULA, PERSIAN GULF & RED SEA
    arabia = [
        (35.0, 29.5), (39.5, 28.0), (45.0, 30.0), (48.0, 30.0), (48.5, 29.0),
        (50.0, 26.5), (50.5, 26.0), (51.5, 25.0), (51.5, 24.5), (54.0, 24.2),
        (56.0, 26.0), (56.5, 24.5), (58.5, 23.5), (59.8, 22.5), (59.0, 21.0),
        (57.5, 19.5), (55.5, 18.0), (53.5, 16.5), (48.5, 14.0), (45.0, 12.8),
        (43.5, 12.6), (43.0, 13.5), (41.5, 16.5), (40.0, 19.5), (38.5, 22.5),
        (37.0, 25.0), (35.0, 28.0), (35.0, 29.5)
    ]
    draw_polygon_set(arabia, COLOR_DESERT, COLOR_COAST_CRISP, width=2)

    # 10. AFRICA & HORN OF AFRICA
    africa = [
        (32.5, 31.5), (34.0, 27.5), (37.0, 22.0), (40.0, 16.0), (43.0, 12.5),
        (51.2, 10.5), (49.5, 5.0),  (44.0, 1.0),  (40.5, -3.0), (39.5, -6.5),
        (40.5, -10.0), (40.5, -15.0), (35.5, -20.0), (32.5, -26.0), (28.0, -32.5),
        (18.5, -34.8), (17.5, -30.0), (14.5, -23.0), (12.0, -15.0), (9.0, -5.0),
        (9.5, 4.0),   (3.0, 6.2),   (-5.0, 5.0),  (-13.0, 9.0),  (-17.5, 14.8),
        (-16.0, 21.0), (-12.0, 27.5), (-5.5, 36.0), (5.0, 37.0),   (11.0, 37.0),
        (15.0, 32.0), (25.0, 32.0), (32.5, 31.5)
    ]
    draw_polygon_set(africa, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    # 11. MADAGASCAR
    madagascar = [
        (49.2, -12.0), (50.5, -15.5), (48.5, -22.0), (47.0, -25.5), (44.5, -25.2),
        (43.5, -22.0), (44.2, -16.0), (47.0, -13.0), (49.2, -12.0)
    ]
    draw_polygon_set(madagascar, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    # 12. SOUTHEAST ASIA (Sumatra, Java, Borneo, Philippines)
    sumatra = [
        (95.3, 5.6), (98.5, 3.0), (102.5, -0.5), (106.0, -5.8),
        (104.5, -5.5), (101.5, -3.0), (98.5, 0.5), (95.3, 5.6)
    ]
    draw_polygon_set(sumatra, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    java = [
        (106.0, -6.0), (110.0, -6.8), (114.5, -7.8), (114.2, -8.8),
        (109.0, -7.8), (106.0, -7.0), (106.0, -6.0)
    ]
    draw_polygon_set(java, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    borneo = [
        (109.5, 1.5), (113.0, 4.5), (117.5, 4.2), (119.0, 2.5),
        (117.0, -1.5), (114.0, -3.5), (111.0, -2.5), (109.5, 1.5)
    ]
    draw_polygon_set(borneo, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    # 13. AUSTRALIA
    australia = [
        (114, -22), (116, -34), (124, -34), (135, -34), (140, -38),
        (148, -38), (153, -28), (150, -20), (142, -11), (136, -12),
        (130, -13), (122, -17), (114, -22)
    ]
    draw_polygon_set(australia, COLOR_DESERT, COLOR_COAST_CRISP, width=2)

    # 14. EURASIA
    eurasia = [
        (-9, 38), (-1, 43), (5, 43), (12, 44), (15, 40), (22, 38), (28, 41),
        (30, 46), (40, 44), (50, 40), (55, 35), (60, 38), (70, 42), (80, 45),
        (90, 48), (105, 52), (120, 50), (135, 45), (140, 40), (140, 55),
        (160, 60), (175, 65), (170, 70), (140, 72), (110, 75), (80, 73),
        (60, 68), (45, 68), (30, 70), (20, 65), (10, 60), (0, 50), (-5, 48),
        (-9, 42), (-9, 38)
    ]
    draw_polygon_set(eurasia, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    # 15. AMERICAS & ANTARCTICA
    north_america = [
        (-125, 48), (-120, 35), (-110, 25), (-100, 20), (-90, 20),
        (-82, 25), (-80, 30), (-75, 35), (-70, 43), (-65, 45),
        (-80, 55), (-90, 60), (-120, 60), (-130, 55), (-125, 48)
    ]
    draw_polygon_set(north_america, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    south_america = [
        (-78, 8), (-70, 11), (-60, 5), (-50, 0), (-35, -5),
        (-40, -20), (-50, -30), (-65, -45), (-70, -53), (-75, -45),
        (-72, -30), (-78, -10), (-80, -2), (-78, 8)
    ]
    draw_polygon_set(south_america, COLOR_LAND_PLAINS, COLOR_COAST_CRISP, width=2)

    antarctica = [(-180, -70), (180, -70), (180, -90), (-180, -90)]
    draw_polygon_set(antarctica, (40, 55, 75, 255), COLOR_COAST_CRISP, width=2)

    # Composite:
    # 1. Blur shelf layer for realistic underwater bathymetric glow
    shelf_blurred = shelf_layer.filter(ImageFilter.GaussianBlur(radius=8))
    img.alpha_composite(shelf_blurred)

    # 2. Composite sharp land layer on top so land stands out with absolute clarity
    img.alpha_composite(land_layer)

    img.save(OUTPUT_PATH, "PNG")
    print(f"Master high-contrast Earth & Bathymetry texture saved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_texture()
