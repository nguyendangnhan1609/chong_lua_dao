// Dữ liệu mẫu hư cấu (tên/miền .example/.test). Không dùng thương hiệu thật.
const SAMPLE = [
  {
    "id": "wf-1",
    "name": "Cửa hàng Hoa Nắng",
    "domain": "hoanang-shop.example",
    "owner": "Công ty TNHH Hoa Nắng Mẫu",
    "mst": "0100000001",
    "phone": "0900 000 001",
    "createdAt": "2019-03-12",
    "checks": {
      "gov": {
        "source": "Cổng đăng ký doanh nghiệp (giả lập)",
        "date": "2026-10-20",
        "result": "Khớp MST 0100000001, tên và địa chỉ trùng",
        "points": 30
      },
      "phone": {
        "source": "Xác minh SĐT qua mã OTP (giả lập)",
        "date": "2026-10-20",
        "result": "SĐT khớp với hồ sơ doanh nghiệp",
        "points": 20
      },
      "ownership": {
        "source": "Kiểm tra mã xác nhận trên website (giả lập)",
        "date": "2026-10-20",
        "result": "Tìm thấy mã xác nhận trên trang chủ",
        "points": 20
      },
      "history": {
        "source": "Tra cứu ngày tạo tên miền (giả lập)",
        "date": "2026-10-20",
        "result": "Tên miền tạo năm 2019 (trên 5 năm)",
        "points": 15
      },
      "blacklist": {
        "source": "Danh sách website giả mạo (giả lập)",
        "date": "2026-10-20",
        "result": "Không trùng danh sách",
        "points": 15
      }
    },
    "ownershipProven": true,
    "blacklistMatch": false,
    "grant": "high",
    "pending": false,
    "complaints": {
      "count": 0,
      "accepted": 0
    },
    "adminConfirmedSuspect": false,
    "suspectReason": "",
    "inspection": {
      "call": true,
      "meet": true,
      "evidence": true,
      "note": "Đã gọi điện và gặp trực tiếp tại cửa hàng (dữ liệu minh họa)."
    },
    "ai": "Gợi ý AI (soạn sẵn, chỉ tham khảo): nội dung trang nhất quán với hồ sơ doanh nghiệp; không thấy dấu hiệu bất thường.",
    "log": [
      {
        "at": "2026-10-10",
        "text": "Quản trị cấp mức thấp"
      },
      {
        "at": "2026-10-18",
        "text": "Thẩm định gọi điện và gặp trực tiếp đạt, nâng mức cao"
      }
    ]
  },
  {
    "id": "wf-2",
    "name": "Phòng khám Minh An",
    "domain": "minhan-clinic.test",
    "owner": "Công ty Cổ phần Minh An Mẫu",
    "mst": "0100000002",
    "phone": "0900 000 002",
    "createdAt": "2022-06-01",
    "checks": {
      "gov": {
        "source": "Cổng đăng ký doanh nghiệp (giả lập)",
        "date": "2026-10-20",
        "result": "Khớp MST 0100000002",
        "points": 30
      },
      "phone": {
        "source": "Xác minh SĐT qua mã OTP (giả lập)",
        "date": "2026-10-20",
        "result": "SĐT khớp",
        "points": 20
      },
      "ownership": {
        "source": "Kiểm tra mã xác nhận trên website (giả lập)",
        "date": "2026-10-20",
        "result": "Tìm thấy tệp xác nhận trên website",
        "points": 20
      },
      "history": {
        "source": "Tra cứu ngày tạo tên miền (giả lập)",
        "date": "2026-10-20",
        "result": "Tên miền tạo năm 2022 (2-5 năm)",
        "points": 10
      },
      "blacklist": {
        "source": "Danh sách website giả mạo (giả lập)",
        "date": "2026-10-20",
        "result": "Không trùng danh sách",
        "points": 15
      }
    },
    "ownershipProven": true,
    "blacklistMatch": false,
    "grant": "low",
    "pending": false,
    "complaints": {
      "count": 0,
      "accepted": 0
    },
    "adminConfirmedSuspect": false,
    "suspectReason": "",
    "inspection": {
      "call": false,
      "meet": false,
      "evidence": false,
      "note": ""
    },
    "ai": "Gợi ý AI (soạn sẵn, chỉ tham khảo): thông tin liên hệ khớp hồ sơ; nên bổ sung thẩm định thực tế để lên mức cao.",
    "log": [
      {
        "at": "2026-10-12",
        "text": "Quản trị cấp mức thấp"
      }
    ]
  },
  {
    "id": "wf-3",
    "name": "Quán Cà phê Gió Biển",
    "domain": "giobien-cafe.example",
    "owner": "Hộ kinh doanh Gió Biển Mẫu",
    "mst": "0100000003",
    "phone": "0900 000 003",
    "createdAt": "2024-11-20",
    "checks": {
      "gov": {
        "source": "Cổng đăng ký doanh nghiệp (giả lập)",
        "date": "2026-10-20",
        "result": "Khớp MST 0100000003, địa chỉ lệch nhẹ",
        "points": 15
      },
      "phone": {
        "source": "Xác minh SĐT qua mã OTP (giả lập)",
        "date": "2026-10-20",
        "result": "SĐT khớp",
        "points": 20
      },
      "ownership": {
        "source": "Kiểm tra mã xác nhận trên website (giả lập)",
        "date": "2026-10-20",
        "result": "Xác nhận qua mã gửi về email",
        "points": 20
      },
      "history": {
        "source": "Tra cứu ngày tạo tên miền (giả lập)",
        "date": "2026-10-20",
        "result": "Tên miền tạo năm 2024 (dưới 2 năm)",
        "points": 5
      },
      "blacklist": {
        "source": "Danh sách website giả mạo (giả lập)",
        "date": "2026-10-20",
        "result": "Không trùng danh sách",
        "points": 15
      }
    },
    "ownershipProven": true,
    "blacklistMatch": false,
    "grant": "low",
    "pending": false,
    "complaints": {
      "count": 0,
      "accepted": 0
    },
    "adminConfirmedSuspect": false,
    "suspectReason": "",
    "inspection": {
      "call": false,
      "meet": false,
      "evidence": false,
      "note": ""
    },
    "ai": "Gợi ý AI (soạn sẵn, chỉ tham khảo): trang còn mới, nên theo dõi thêm theo thời gian.",
    "log": [
      {
        "at": "2026-10-14",
        "text": "Quản trị cấp mức thấp"
      }
    ]
  },
  {
    "id": "wf-4",
    "name": "Tiệm Sách Lá Xanh",
    "domain": "laxanh-books.test",
    "owner": "(chưa có hồ sơ)",
    "mst": "",
    "phone": "",
    "createdAt": "2025-09-02",
    "checks": {
      "gov": {
        "source": "Cổng đăng ký doanh nghiệp (giả lập)",
        "date": "2026-10-20",
        "result": "Không tìm thấy doanh nghiệp tương ứng",
        "points": 0
      },
      "phone": {
        "source": "Xác minh SĐT qua mã OTP (giả lập)",
        "date": "2026-10-20",
        "result": "Chưa có SĐT để đối chiếu",
        "points": 0
      },
      "ownership": {
        "source": "Kiểm tra mã xác nhận trên website (giả lập)",
        "date": "2026-10-20",
        "result": "Chưa chứng minh quyền sở hữu",
        "points": 0
      },
      "history": {
        "source": "Tra cứu ngày tạo tên miền (giả lập)",
        "date": "2026-10-20",
        "result": "Tên miền tạo năm 2025 (dưới 2 năm)",
        "points": 5
      },
      "blacklist": {
        "source": "Danh sách website giả mạo (giả lập)",
        "date": "2026-10-20",
        "result": "Không trùng danh sách",
        "points": 15
      }
    },
    "ownershipProven": false,
    "blacklistMatch": false,
    "grant": "none",
    "pending": false,
    "complaints": {
      "count": 0,
      "accepted": 0
    },
    "adminConfirmedSuspect": false,
    "suspectReason": "",
    "inspection": {
      "call": false,
      "meet": false,
      "evidence": false,
      "note": ""
    },
    "ai": "Gợi ý AI (soạn sẵn, chỉ tham khảo): chưa đủ thông tin để đánh giá; nên liên hệ chủ sở hữu để đăng ký xác thực.",
    "log": []
  },
  {
    "id": "wf-5",
    "name": "Cửa hàng Hoa Nâng",
    "domain": "hoanang-shop-vn.example",
    "owner": "(ẩn danh)",
    "mst": "",
    "phone": "",
    "createdAt": "2026-10-01",
    "checks": {
      "gov": {
        "source": "Cổng đăng ký doanh nghiệp (giả lập)",
        "date": "2026-10-20",
        "result": "Không khớp doanh nghiệp nào",
        "points": 0
      },
      "phone": {
        "source": "Xác minh SĐT qua mã OTP (giả lập)",
        "date": "2026-10-20",
        "result": "SĐT không khớp",
        "points": 0
      },
      "ownership": {
        "source": "Kiểm tra mã xác nhận trên website (giả lập)",
        "date": "2026-10-20",
        "result": "Chưa chứng minh quyền sở hữu",
        "points": 0
      },
      "history": {
        "source": "Tra cứu ngày tạo tên miền (giả lập)",
        "date": "2026-10-20",
        "result": "Tên miền mới tạo trong 30 ngày",
        "points": 3
      },
      "blacklist": {
        "source": "Danh sách website giả mạo (giả lập)",
        "date": "2026-10-20",
        "result": "Trùng danh sách website giả mạo",
        "points": 0
      }
    },
    "ownershipProven": false,
    "blacklistMatch": true,
    "grant": "none",
    "pending": false,
    "complaints": {
      "count": 6,
      "accepted": 5
    },
    "adminConfirmedSuspect": true,
    "suspectReason": "Tên và giao diện gần giống \"Cửa hàng Hoa Nắng\" (hoanang-shop.example), tên miền mới tạo, nằm trong danh sách giả mạo.",
    "inspection": {
      "call": false,
      "meet": false,
      "evidence": false,
      "note": ""
    },
    "ai": "Gợi ý AI (soạn sẵn, chỉ tham khảo): tên gần giống một website đã xác thực; nên thận trọng khi giao dịch.",
    "log": [
      {
        "at": "2026-10-15",
        "text": "Quản trị đánh dấu nghi ngờ: trùng danh sách, 5 khiếu nại đã tiếp nhận"
      }
    ]
  },
  {
    "id": "wf-6",
    "name": "Nhà thuốc Bình Tâm",
    "domain": "binhtam-pharmacy.test",
    "owner": "Công ty TNHH Bình Tâm Mẫu",
    "mst": "0100000006",
    "phone": "0900 000 006",
    "createdAt": "2021-01-15",
    "checks": {
      "gov": {
        "source": "Cổng đăng ký doanh nghiệp (giả lập)",
        "date": "2026-10-20",
        "result": "Khớp MST 0100000006",
        "points": 30
      },
      "phone": {
        "source": "Xác minh SĐT qua mã OTP (giả lập)",
        "date": "2026-10-20",
        "result": "SĐT khớp",
        "points": 20
      },
      "ownership": {
        "source": "Kiểm tra mã xác nhận trên website (giả lập)",
        "date": "2026-10-20",
        "result": "Đang chờ chứng minh quyền sở hữu",
        "points": 0
      },
      "history": {
        "source": "Tra cứu ngày tạo tên miền (giả lập)",
        "date": "2026-10-20",
        "result": "Tên miền tạo năm 2021 (2-5 năm)",
        "points": 10
      },
      "blacklist": {
        "source": "Danh sách website giả mạo (giả lập)",
        "date": "2026-10-20",
        "result": "Không trùng danh sách",
        "points": 15
      }
    },
    "ownershipProven": false,
    "blacklistMatch": false,
    "grant": "none",
    "pending": true,
    "complaints": {
      "count": 0,
      "accepted": 0
    },
    "adminConfirmedSuspect": false,
    "suspectReason": "",
    "inspection": {
      "call": false,
      "meet": false,
      "evidence": false,
      "note": ""
    },
    "ai": "Gợi ý AI (soạn sẵn, chỉ tham khảo): hồ sơ đang chờ duyệt; cần hoàn tất chứng minh quyền sở hữu.",
    "log": [
      {
        "at": "2026-10-25",
        "text": "Doanh nghiệp gửi hồ sơ đăng ký"
      }
    ]
  }
];

export function createSampleData() {
  return JSON.parse(JSON.stringify(SAMPLE));
}
